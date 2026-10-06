import React, { useState } from 'react';
import { ArrowLeft, Upload, CheckCircle2, AlertCircle, FileCode, FileText, KeyRound, Sparkles } from 'lucide-react';
import { M3Button } from '../components/common/M3Button';
import { BotBridge, SelectedFileResult } from '../bridge/BotBridge';
import { useBots } from '../state/BotContext';
import { Bot, BotFileEntry } from '../models/bot';

interface NewBotScreenProps {
  onBack: () => void;
  onDeploySuccess: (bot: Bot) => void;
}

export const NewBotScreen: React.FC<NewBotScreenProps> = ({
  onBack,
  onDeploySuccess,
}) => {
  const { createBot } = useBots();

  const [botName, setBotName] = useState('');
  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');

  // Uploaded files
  const [botPyFile, setBotPyFile] = useState<SelectedFileResult | null>(null);
  const [reqFile, setReqFile] = useState<SelectedFileResult | null>(null);
  const [envFile, setEnvFile] = useState<SelectedFileResult | null>(null);

  // Validation Errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState<string>('');

  // Parse lines count
  const countLines = (str?: string) => {
    if (!str) return 0;
    return str.split('\n').length;
  };

  // File picker handler
  const handleSelectFile = async (type: 'bot' | 'requirements' | 'env') => {
    setErrors((prev) => ({ ...prev, [type]: '' }));

    let accept = '*/*';
    if (type === 'bot') accept = '.py,text/x-python';
    if (type === 'requirements') accept = '.txt,text/plain';
    if (type === 'env') accept = '.env,text/plain';

    try {
      const result = await BotBridge.selectFile({
        accept,
        expectedType: type,
      });

      if (!result) return;

      if (type === 'bot') {
        const lowerName = result.fileName.toLowerCase();
        if (!lowerName.endsWith('.py')) {
          setErrors((prev) => ({
            ...prev,
            bot: 'Invalid file. Please select a valid Python bot file ending in .py',
          }));
          return;
        }
        if (result.fileSize === 0) {
          setErrors((prev) => ({
            ...prev,
            bot: 'The selected Python file is empty (0 bytes).',
          }));
          return;
        }
        setBotPyFile(result);

        // Auto-detect bot name if not already provided
        if (!botName.trim()) {
          const derived = result.fileName
            .replace(/\.py$/i, '')
            .replace(/[-_]/g, ' ');
          const formatted = derived.charAt(0).toUpperCase() + derived.slice(1);
          setBotName(formatted);
          if (!username.trim()) {
            setUsername(`@${derived.toLowerCase().replace(/\s+/g, '_')}_bot`);
          }
        }
      } else if (type === 'requirements') {
        const lowerName = result.fileName.toLowerCase();
        if (!lowerName.endsWith('.txt')) {
          setErrors((prev) => ({
            ...prev,
            requirements: 'Invalid file. Please select a requirements.txt file.',
          }));
          return;
        }
        if (result.fileSize === 0) {
          setErrors((prev) => ({
            ...prev,
            requirements: 'requirements.txt is empty. Please list required packages.',
          }));
          return;
        }
        setReqFile(result);
      } else if (type === 'env') {
        setEnvFile(result);
      }
    } catch {
      setErrors((prev) => ({
        ...prev,
        [type]: 'Unable to select this file. Please try again.',
      }));
    }
  };

  // Quick fill with sample bot package for rapid testing
  const handleLoadSampleTemplate = (templateType: 'echo' | 'news' | 'notifier') => {
    if (templateType === 'echo') {
      setBotName('Echo Responder');
      setUsername('@echo_responder_bot');
      setDescription('Standard echo bot utilizing python-telegram-bot');
      setBotPyFile({
        fileName: 'bot.py',
        fileSize: 2180,
        content: `# Echo Responder Bot\nfrom telegram import Update\nfrom telegram.ext import ApplicationBuilder, MessageHandler, filters\n`,
      });
      setReqFile({
        fileName: 'requirements.txt',
        fileSize: 52,
        content: `python-telegram-bot==20.7\n`,
      });
      setEnvFile({
        fileName: '.env',
        fileSize: 85,
        content: `TELEGRAM_BOT_TOKEN="demo_token_echo_123"\n`,
      });
    } else if (templateType === 'news') {
      setBotName('News Telegram Digest');
      setUsername('@news_digest_bot');
      setDescription('RSS feed reader and channel broadcast bot');
      setBotPyFile({
        fileName: 'main.py',
        fileSize: 3410,
        content: `# News Digest Bot\nimport feedparser\nfrom telegram import Bot\n`,
      });
      setReqFile({
        fileName: 'requirements.txt',
        fileSize: 74,
        content: `python-telegram-bot==20.7\nfeedparser>=6.0.0\n`,
      });
      setEnvFile(null);
    } else {
      setBotName('Crypto Watcher');
      setUsername('@crypto_watcher_bot');
      setDescription('Price alert and ticker tracker bot');
      setBotPyFile({
        fileName: 'bot.py',
        fileSize: 2890,
        content: `# Crypto Watcher\nimport requests\n`,
      });
      setReqFile({
        fileName: 'requirements.txt',
        fileSize: 64,
        content: `python-telegram-bot==20.7\nrequests>=2.28.0\n`,
      });
      setEnvFile({
        fileName: '.env',
        fileSize: 94,
        content: `TELEGRAM_BOT_TOKEN="demo_crypto_token"\nALERT_THRESHOLD="0.05"\n`,
      });
    }
    setErrors({});
  };

  const isFormValid =
    Boolean(botPyFile) &&
    Boolean(reqFile);

  const handleDeploy = async () => {
    if (!isFormValid || isDeploying || !botPyFile || !reqFile) return;

    setIsDeploying(true);
    setDeployStep('Creating local project repository...');

    setTimeout(() => {
      setDeployStep('Validating source files & structure...');
    }, 500);

    setTimeout(() => {
      setDeployStep('Saving metadata and isolating .env...');
    }, 1100);

    setTimeout(async () => {
      const mainFile: BotFileEntry = {
        name: botPyFile.fileName,
        size: botPyFile.fileSize,
        lastModified: new Date().toISOString().slice(0, 16).replace('T', ' '),
        content: botPyFile.content,
        lineCount: countLines(botPyFile.content),
      };

      const reqFileEntry: BotFileEntry = {
        name: reqFile.fileName,
        size: reqFile.fileSize,
        lastModified: new Date().toISOString().slice(0, 16).replace('T', ' '),
        content: reqFile.content,
        lineCount: countLines(reqFile.content),
      };

      const envFileEntry: BotFileEntry | undefined = envFile
        ? {
            name: envFile.fileName,
            size: envFile.fileSize,
            lastModified: new Date().toISOString().slice(0, 16).replace('T', ' '),
            content: envFile.content,
            isMasked: true,
            lineCount: countLines(envFile.content),
          }
        : undefined;

      const newBot = await createBot({
        name: botName,
        username,
        mainFile,
        reqFile: reqFileEntry,
        envFile: envFileEntry,
        description,
      });

      setIsDeploying(false);
      onDeploySuccess(newBot);
    }, 1700);
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-5 py-4 pb-6 transition-colors">
      {/* Top App Bar with back navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--color-outline-variant)]/20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-[var(--color-on-surface)] hover:bg-[var(--color-on-surface)]/8 active:bg-[var(--color-on-surface)]/12 transition-colors cursor-pointer"
            aria-label="Go back to Home"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-on-surface)]">
              New Bot
            </h1>
            <p className="text-[11px] text-[var(--color-on-surface-variant)]">
              Create and manage local bot project
            </p>
          </div>
        </div>
      </div>

      {/* Quick sample template selector */}
      <div className="my-3 p-3 rounded-2xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-on-surface)]">
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Quick Start Templates</span>
          </div>
          <span className="text-[10px] text-[var(--color-on-surface-variant)]">
            1-tap autofill
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => handleLoadSampleTemplate('echo')}
            className="px-2 py-1.5 rounded-lg bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] text-[11px] font-medium text-[var(--color-on-surface)] text-center transition-colors cursor-pointer truncate"
          >
            Echo Bot
          </button>
          <button
            type="button"
            onClick={() => handleLoadSampleTemplate('news')}
            className="px-2 py-1.5 rounded-lg bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] text-[11px] font-medium text-[var(--color-on-surface)] text-center transition-colors cursor-pointer truncate"
          >
            News Digest
          </button>
          <button
            type="button"
            onClick={() => handleLoadSampleTemplate('notifier')}
            className="px-2 py-1.5 rounded-lg bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] text-[11px] font-medium text-[var(--color-on-surface)] text-center transition-colors cursor-pointer truncate"
          >
            Crypto Alert
          </button>
        </div>
      </div>

      {/* Form Content */}
      <div className="flex flex-col gap-4">
        {/* File Upload Section */}
        <div>
          <h2 className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider mb-2.5">
            Bot Source Files
          </h2>

          <div className="flex flex-col gap-2.5">
            {/* 1. Upload bot.py (Required) */}
            <div
              onClick={() => handleSelectFile('bot')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer m3-pressable ${
                botPyFile
                  ? 'bg-emerald-500/8 border-emerald-500/40 dark:bg-emerald-500/10'
                  : errors.bot
                  ? 'bg-[var(--color-error)]/10 border-[var(--color-error)]'
                  : 'bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]/40 hover:bg-[var(--color-surface-container-high)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      botPyFile
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]'
                    }`}
                  >
                    <FileCode className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[var(--color-on-surface)]">
                        Upload bot.py
                      </span>
                      <span className="text-[10px] font-bold text-[var(--color-error)]">
                        *REQUIRED
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-on-surface-variant)]">
                      {botPyFile ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                          ✓ {botPyFile.fileName} ({Math.round(botPyFile.fileSize / 1024 * 10) / 10} KB)
                        </span>
                      ) : (
                        'Accepts bot.py or any Python script (.py)'
                      )}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {botPyFile ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Upload className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
                  )}
                </div>
              </div>

              {errors.bot && (
                <div className="mt-2 pt-2 border-t border-[var(--color-error)]/20 flex items-center gap-1.5 text-xs text-[var(--color-error)]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.bot}</span>
                </div>
              )}
            </div>

            {/* 2. Upload requirements.txt (Required) */}
            <div
              onClick={() => handleSelectFile('requirements')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer m3-pressable ${
                reqFile
                  ? 'bg-emerald-500/8 border-emerald-500/40 dark:bg-emerald-500/10'
                  : errors.requirements
                  ? 'bg-[var(--color-error)]/10 border-[var(--color-error)]'
                  : 'bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]/40 hover:bg-[var(--color-surface-container-high)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      reqFile
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]'
                    }`}
                  >
                    <FileText className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[var(--color-on-surface)]">
                        Upload requirements.txt
                      </span>
                      <span className="text-[10px] font-bold text-[var(--color-error)]">
                        *REQUIRED
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-on-surface-variant)]">
                      {reqFile ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                          ✓ {reqFile.fileName} ({reqFile.fileSize} bytes)
                        </span>
                      ) : (
                        'Python dependency list (.txt)'
                      )}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {reqFile ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Upload className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
                  )}
                </div>
              </div>

              {errors.requirements && (
                <div className="mt-2 pt-2 border-t border-[var(--color-error)]/20 flex items-center gap-1.5 text-xs text-[var(--color-error)]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.requirements}</span>
                </div>
              )}
            </div>

            {/* 3. Upload .env (Optional) */}
            <div
              onClick={() => handleSelectFile('env')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer m3-pressable ${
                envFile
                  ? 'bg-emerald-500/8 border-emerald-500/40 dark:bg-emerald-500/10'
                  : 'bg-[var(--color-surface-container)] border-[var(--color-outline-variant)]/40 hover:bg-[var(--color-surface-container-high)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      envFile
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)]'
                    }`}
                  >
                    <KeyRound className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-[var(--color-on-surface)]">
                        Upload .env
                      </span>
                      <span className="text-[10px] font-medium text-[var(--color-on-surface-variant)] bg-[var(--color-surface-container-highest)] px-1.5 py-0.5 rounded">
                        Optional
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-on-surface-variant)]">
                      {envFile ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                          ✓ {envFile.fileName} (Masked & Protected)
                        </span>
                      ) : (
                        'Bot credentials and secrets'
                      )}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {envFile ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Upload className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bot Name & Handle (Auto-detected if left empty) */}
        <div className="pt-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
              Bot Metadata
            </h2>
            <span className="text-[11px] text-[var(--color-primary)]">
              Auto-detected from files
            </span>
          </div>

          <div>
            <label
              htmlFor="bot-name"
              className="block text-xs font-medium text-[var(--color-on-surface)] mb-1"
            >
              Bot Name
            </label>
            <input
              id="bot-name"
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder="e.g. My Telegram Bot (or leave empty to auto-detect)"
              className="w-full h-12 px-4 rounded-xl bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)]/50 border border-[var(--color-outline-variant)]/40 focus:border-[var(--color-primary)] focus:outline-hidden text-sm transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="bot-username"
              className="block text-xs font-medium text-[var(--color-on-surface)] mb-1"
            >
              Telegram @Handle
            </label>
            <input
              id="bot-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@my_bot (auto-generated if empty)"
              className="w-full h-12 px-4 rounded-xl bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)]/50 border border-[var(--color-outline-variant)]/40 focus:border-[var(--color-primary)] focus:outline-hidden text-sm font-mono transition-colors"
            />
          </div>
        </div>

        {/* Deploy Action */}
        <div className="pt-3 pb-2">
          <M3Button
            variant="filled"
            size="lg"
            disabled={!isFormValid || isDeploying}
            loading={isDeploying}
            onClick={handleDeploy}
            className="w-full text-base font-semibold shadow-md"
          >
            {isDeploying ? deployStep || 'Deploying...' : 'Deploy'}
          </M3Button>

          {!isFormValid && (
            <p className="text-[11px] text-center text-[var(--color-on-surface-variant)] mt-2">
              Please upload both bot.py and requirements.txt to deploy.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
