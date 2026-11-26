package ir.alooshomal.smsgateway

import android.app.Application
import ir.alooshomal.smsgateway.notifications.Notifications

class AlooshomalApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Notifications.ensureChannels(this)
    }
}
