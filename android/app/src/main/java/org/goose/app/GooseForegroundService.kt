package org.goose.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

/**
 * Android Foreground Service for 24/7 continuous autonomous bot execution.
 * Keeps Python bot daemons running reliably when the app UI is closed.
 */
class GooseForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "goose_bot_foreground_channel"
        const val NOTIFICATION_ID = 2001
        const val ACTION_START_247 = "org.goose.app.START_247"
        const val ACTION_STOP_247 = "org.goose.app.STOP_247"
        const val EXTRA_BOT_NAME = "extra_bot_name"
        const val EXTRA_BOT_ID = "extra_bot_id"

        var isServiceRunning = false
            private set

        fun startService(context: Context, botId: String, botName: String) {
            val intent = Intent(context, GooseForegroundService::class.java).apply {
                action = ACTION_START_247
                putExtra(EXTRA_BOT_ID, botId)
                putExtra(EXTRA_BOT_NAME, botName)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, GooseForegroundService::class.java).apply {
                action = ACTION_STOP_247
            }
            context.stopService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP_247) {
            stopSelf()
            isServiceRunning = false
            return START_NOT_STICKY
        }

        val botName = intent?.getStringExtra(EXTRA_BOT_NAME) ?: "Telegram Bot"
        val notification = buildPersistentNotification(botName)

        startForeground(NOTIFICATION_ID, notification)
        isServiceRunning = true

        return START_STICKY
    }

    override fun onDestroy() {
        isServiceRunning = false
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Goose 24/7 Bot Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows continuous notification while Telegram bots are running 24/7"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildPersistentNotification(botName: String): Notification {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingLaunch = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val stopIntent = Intent(this, GooseForegroundService::class.java).apply {
            action = ACTION_STOP_247
        }
        val pendingStop = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Goose")
            .setContentText("$botName ● Running in background")
            .setSubText("24/7 Mode Active")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingLaunch)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .addAction(android.R.drawable.ic_media_pause, "Stop", pendingStop)
            .addAction(android.R.drawable.ic_menu_view, "Open Goose", pendingLaunch)
            .build()
    }
}
