  // Trusted
  function copytTrustedEmailToClipboard() {
    var email = document.getElementById('email-content-trusted').getAttribute('href').replace('mailto:', '');
    navigator.clipboard.writeText(email)
      .then(function() {
        console.log('Trusted mail copied to clipboard');
      })
      .catch(function(err) {
        console.error('Failed to copy email: ', err);
      });

    document.getElementById('emailImage-trusted').src = "static/icons/check.png";
    setTimeout(function() {
      document.getElementById('emailImage-trusted').src = "static/icons/copy.png";
    }, 2500);
  }

  document.getElementById('emailImage-trusted').addEventListener('click', function() {
    copytTrustedEmailToClipboard();
  });

  document.getElementById('emailImage-trusted').classList.add('img-inverter');