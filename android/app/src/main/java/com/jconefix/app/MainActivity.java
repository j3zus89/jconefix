package com.jconefix.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

/**
 * WebView tipo app: sin overscroll del WebView, sin ActionBar.
 * Barras de sistema visibles y del color de marca (#004d40) — no modo inmersivo que oculta el botón atrás/home.
 */
public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      getWindow().setNavigationBarContrastEnforced(false);
      getWindow().setStatusBarContrastEnforced(false);
    }
    applyBrandSystemBars();
  }

  @Override
  public void onResume() {
    super.onResume();
    applyBrandSystemBars();
    Bridge bridge = getBridge();
    if (bridge == null) {
      return;
    }
    WebView webView = bridge.getWebView();
    if (webView == null) {
      return;
    }
    webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
    webView.setHorizontalScrollBarEnabled(false);
    webView.setVerticalScrollBarEnabled(false);
    webView.setBackgroundColor(Color.parseColor("#004D40"));
  }

  /** Status + navigation bar visibles, color #004d40, iconos claros (coherente con Capacitor StatusBar LIGHT). */
  private void applyBrandSystemBars() {
    int brand = Color.parseColor("#004D40");
    getWindow().setStatusBarColor(brand);
    getWindow().setNavigationBarColor(brand);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      getWindow().setNavigationBarDividerColor(Color.TRANSPARENT);
    }
    WindowInsetsControllerCompat c =
        new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
    c.setAppearanceLightStatusBars(false);
    c.setAppearanceLightNavigationBars(false);
    c.show(WindowInsetsCompat.Type.statusBars());
    c.show(WindowInsetsCompat.Type.navigationBars());
  }
}
