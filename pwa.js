let deferredInstallPrompt = null;
const installButton = document.getElementById('appInstallieren');

function istStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function istIOS(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try { await navigator.serviceWorker.register('./service-worker.js'); }
    catch (err) { console.warn('Service Worker konnte nicht registriert werden:', err); }
  });
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (installButton && !istStandalone()) installButton.hidden = false;
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  if (installButton) installButton.hidden = true;
});

if (installButton) {
  if (istIOS() && !istStandalone()) installButton.hidden = false;
  if (istStandalone()) installButton.hidden = true;

  installButton.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installButton.hidden = true;
      return;
    }
    if (istIOS()) {
      alert('Auf iPhone/iPad: Öffne diese Seite in Safari, tippe unten auf „Teilen“ und anschließend auf „Zum Home-Bildschirm“.');
      return;
    }
    alert('Falls dein Browser keinen Installationsdialog anbietet, öffne das Browsermenü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.');
  });
}
