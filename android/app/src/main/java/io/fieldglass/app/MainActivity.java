package io.fieldglass.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import io.fieldglass.app.sensors.SensorsPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins that live inside the app must be registered before the bridge starts.
        registerPlugin(SensorsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
