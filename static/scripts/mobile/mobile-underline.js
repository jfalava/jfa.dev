document.addEventListener('DOMContentLoaded', function() {
    function toggleDisplay() {
        const mobileUnderline = document.querySelector('.mobile-underline');
        if (window.innerWidth < 812) {
            mobileUnderline.style.display = '';
        } else {
            mobileUnderline.style.display = 'none';
        }
    }
    toggleDisplay();
    window.addEventListener('resize', toggleDisplay);
});