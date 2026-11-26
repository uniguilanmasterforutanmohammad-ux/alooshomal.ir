# kotlinx.serialization keeps generated serializers via annotations.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class ir.alooshomal.smsgateway.data.** {
    *** Companion;
}
-keepclasseswithmembers class ir.alooshomal.smsgateway.data.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Tink (used by androidx.security) references compile-time annotations that are
# not needed on Android.
-dontwarn com.google.errorprone.annotations.**
