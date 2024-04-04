function toggleAuthorDetails() {
    const showButtonsContainer = document.getElementById('buttons-container');
    const showEmailContainer = document.getElementById('email-container');
    const emailBackButton = document.getElementById('email-back-button');

    showEmailContainer.style.display = '';
    showButtonsContainer.style.display = 'none';
  
    emailBackButton.addEventListener('click', function() {
      showEmailContainer.style.display = 'none';
      showButtonsContainer.style.display = '';
    });
  }