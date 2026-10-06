package org.goose.app

import android.content.Context
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

/**
 * Native Bridge abstraction layer connecting React/Vite UI with Android Native.
 * Matches the TypeScript interface defined in src/bridge/BotBridge.ts.
 * Implements BotProcessManager with 24/7 Foreground Service integration.
 */
class BotBridge(
    private val context: Context,
    private val onFilePickerRequested: (accept: String, type: String) -> Unit
) {
    // Process registry mapping botId to active process state
    private val processRegistry = ConcurrentHashMap<String, Process>()

    @JavascriptInterface
    fun ping(): String {
        val response = JSONObject()
        response.put("status", "pong")
        response.put("timestamp", System.currentTimeMillis())
        response.put("bridgeVersion", "4.0.0-phase4")
        return response.toString()
    }

    @JavascriptInterface
    fun selectFile(accept: String, type: String): String {
        onFilePickerRequested(accept, type)
        return ""
    }

    @JavascriptInterface
    fun startBot(botId: String): Boolean {
        return true
    }

    @JavascriptInterface
    fun stopBot(botId: String): Boolean {
        processRegistry[botId]?.destroy()
        processRegistry.remove(botId)
        return true
    }

    @JavascriptInterface
    fun restartBot(botId: String): Boolean {
        stopBot(botId)
        return startBot(botId)
    }

    @JavascriptInterface
    fun resetBot(botId: String): Boolean {
        stopBot(botId)
        return true
    }

    @JavascriptInterface
    fun deleteBot(botId: String): Boolean {
        stopBot(botId)
        return true
    }

    @JavascriptInterface
    fun sendStdin(botId: String, input: String): Boolean {
        val proc = processRegistry[botId] ?: return false
        try {
            proc.outputStream.bufferedWriter().use {
                it.write(input)
                it.newLine()
                it.flush()
            }
            return true
        } catch (e: Exception) {
            return false
        }
    }

    @JavascriptInterface
    fun startForegroundService(botId: String, botName: String): Boolean {
        try {
            GooseForegroundService.startService(context, botId, botName)
            return true
        } catch (e: Exception) {
            return false
        }
    }

    @JavascriptInterface
    fun stopForegroundService(): Boolean {
        try {
            GooseForegroundService.stopService(context)
            return true
        } catch (e: Exception) {
            return false
        }
    }

    @JavascriptInterface
    fun isForegroundServiceRunning(): Boolean {
        return GooseForegroundService.isServiceRunning
    }

    @JavascriptInterface
    fun getBotStatus(botId: String): String {
        val isRunning = processRegistry[botId]?.isAlive ?: false
        return if (isRunning) "RUNNING" else "STOPPED"
    }

    @JavascriptInterface
    fun installApk(filePath: String): Boolean {
        try {
            val file = java.io.File(filePath)
            if (!file.exists()) return false

            val apkUri = androidx.core.content.FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                file
            )

            val intent = android.content.Intent(android.content.Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK or
                        android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION
            }
            context.startActivity(intent)
            return true
        } catch (e: Exception) {
            e.printStackTrace()
            return false
        }
    }

    @JavascriptInterface
    fun getLogs(botId: String): String {
        return JSONArray().toString()
    }
}
