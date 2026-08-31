let deferredInstallPrompt = null;
const installButton = document.getElementById('appInstallieren');

function istStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function istIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function istSafari() {
  return /Safari/i.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);
}

function zeigeIOSInstallationshilfe() {
  const vorhanden = document.getElementById('iosInstallHilfe');
  if (vorhanden) {
    vorhanden.hidden = false;
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'iosInstallHilfe';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Installation auf iPhone oder iPad');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:9999',
    'background:rgba(0,0,0,.76)', 'display:grid', 'place-items:center',
    'padding:20px'
  ].join(';');

  const box = document.createElement('div');
  box.style.cssText = [
    'width:min(520px,100%)', 'background:#202020', 'color:#f2f2f2',
    'border:1px solid #4a4a4a', 'border-radius:14px', 'padding:22px',
    'box-shadow:0 14px 45px rgba(0,0,0,.5)', 'text-align:left',
    'font-family:Arial,sans-serif', 'line-height:1.5'
  ].join(';');

  const safariHinweis = istSafari()
    ? ''
    : '<p style="margin:0 0 16px;color:#ffdf9e"><strong>Hinweis:</strong> Öffne diese Seite für die Installation zuerst in Safari.</p>';

  box.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px">
      <div>
        <div style="font-size:21px;font-weight:800">5Goddesses installieren</div>
        <div style="color:#b9b9b9;margin-top:2px">iPhone / iPad</div>
      </div>
      <button id="iosInstallSchliessen" aria-label="Schließen" style="padding:5px 10px;font-size:22px;line-height:1;background:#333;border:0;border-radius:7px;color:white;cursor:pointer">×</button>
    </div>
    ${safariHinweis}
    <ol style="margin:0;padding-left:23px">
      <li style="margin:9px 0">Öffne die Seite in <strong>Safari</strong>.</li>
      <li style="margin:9px 0">Tippe auf das <strong>Teilen-Symbol</strong> (Quadrat mit Pfeil nach oben).</li>
      <li style="margin:9px 0">Wähle <strong>„Zum Home-Bildschirm“</strong>.</li>
      <li style="margin:9px 0">Tippe oben rechts auf <strong>„Hinzufügen“</strong>.</li>
    </ol>
    <p style="margin:17px 0 0;color:#b9b9b9">Danach erscheint 5Goddesses wie eine normale App auf deinem Home-Bildschirm und kann auch offline genutzt werden.</p>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  const schliessen = () => overlay.remove();
  box.querySelector('#iosInstallSchliessen').addEventListener('click', schliessen);
  overlay.addEventListener('click', event => {
    if (event.target === overlay) schliessen();
  });
  document.addEventListener('keydown', function esc(event) {
    if (event.key === 'Escape') {
      schliessen();
      document.removeEventListener('keydown', esc);
    }
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./service-worker.js');
    } catch (err) {
      console.warn('Service Worker konnte nicht registriert werden:', err);
    }
  });
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (installButton && !istStandalone()) {
    installButton.textContent = 'App installieren';
    installButton.hidden = false;
  }
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  if (installButton) installButton.hidden = true;
});

if (installButton) {
  if (istStandalone()) {
    installButton.hidden = true;
  } else if (istIOS()) {
    installButton.textContent = 'Auf iPhone installieren';
    installButton.hidden = false;
  }

  installButton.addEventListener('click', async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installButton.hidden = true;
      return;
    }

    if (istIOS()) {
      zeigeIOSInstallationshilfe();
      return;
    }

    alert('Falls dein Browser keinen Installationsdialog anbietet, öffne das Browsermenü und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.');
  });
}
