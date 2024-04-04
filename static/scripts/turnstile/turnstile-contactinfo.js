if (window.matchMedia) {
  const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  console.log(prefersDarkMode);  
  if (prefersDarkMode) {
    console.log('Dark mode is enabled.');
    window.onloadTurnstileCallback = function() {
      turnstile.render('#turnstile-widget', {
        sitekey: '0x4AAAAAAAELud_4ajT9ou1R',
        theme: 'dark',
        callback: function(token) {
          console.log(`Challenge Success ${token}`);
          hideCaptchaAndShowContent();
        },
      });
    };
    function hideCaptchaAndShowContent() {
      document.querySelector(".captcha-box").style.display = "";
      document.querySelector(".captcha-widget").style.display = "none";
    }
  } else {
    window.onloadTurnstileCallback = function() {
      turnstile.render('#turnstile-widget', {
        sitekey: '0x4AAAAAAAELud_4ajT9ou1R',
        theme: 'light',
        callback: function(token) {
          console.log(`Challenge Success ${token}`);
          hideCaptchaAndShowContent();
        },
      });
    };
    function hideCaptchaAndShowContent() {
      document.querySelector(".captcha-box").style.display = "";
      document.querySelector(".captcha-widget").style.display = "none";
    }
  }
} else {
  console.log('matchMedia not supported, unable to determine dark mode.');
  window.onloadTurnstileCallback = function() {
    turnstile.render('#turnstile-widget', {
      sitekey: '0x4AAAAAAAELud_4ajT9ou1R',
      theme: 'dark',
      callback: function(token) {
        console.log(`Challenge Success ${token}`);
        hideCaptchaAndShowContent();
      },
    });
  };
  function hideCaptchaAndShowContent() {
    document.querySelector(".captcha-box").style.display = "";
    document.querySelector(".captcha-widget").style.display = "none";
  }
}