package ir.alooshomal.smsgateway

import android.app.Application
import ir.alooshomal.smsgateway.data.AppSettings
import ir.alooshomal.smsgateway.notifications.Notifications
import ir.alooshomal.smsgateway.sync.HeartbeatWorker

class AlooshomalApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Notifications.ensureChannels(this)
        // Re-arm the heartbeat for devices paired before this worker existed.
        if (AppSettings(this).isPaired) {
            HeartbeatWorker.schedule(this)
        }
    }
}
