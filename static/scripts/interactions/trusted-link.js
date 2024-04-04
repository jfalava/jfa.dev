  function getUrlParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }
  const trustedParam = getUrlParam('trusted');
  const phoneNumberDiv = document.getElementById('phone-number');
  const trustedEmailDiv = document.getElementById('trusted-email');
  const generalEmailDiv = document.getElementById('general-email');
  if (trustedParam === 'true') {
    phoneNumberDiv.style.display = ''; 
    trustedEmailDiv.style.display = ''; 
    generalEmailDiv.style.display = 'none';
  } else {
    phoneNumberDiv.style.display = 'none';
    trustedEmailDiv.style.display = 'none';
    generalEmailDiv.style.display = ''; 
  }