// General
function copyEmailToClipboard() {
    var email = document.getElementById('email-content').getAttribute('href').replace('mailto:', '');
    navigator.clipboard.writeText(email)
      .then(function() {
        console.log('Email copied to clipboard');
      })
      .catch(function(err) {
        console.error('Failed to copy email: ', err);
      });

    document.getElementById('emailImage').src = "static/icons/check.png";
    setTimeout(function() {
      document.getElementById('emailImage').src = "static/icons/copy.png";
    }, 2500);
  }

  document.getElementById('emailImage').addEventListener('click', function() {
    copyEmailToClipboard();
  });

  document.getElementById('emailImage').classList.add('img-inverter');

