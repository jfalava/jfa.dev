(function () {
  function y(s: string) {
    return s.replace(/[a-zA-Z]/g, (c: string) => {
      const charCode = c.charCodeAt(0);
      const shift = (charCode <= 90 ? 90 : 122) >= charCode + 13 ? 13 : -13;
      return String.fromCharCode(charCode + shift);
    });
  }

  const reveal = document.getElementById("email") as HTMLElement;
  const dialog = document.querySelector("dialog") as HTMLElement;
  reveal.addEventListener("click", () => {
    dialog.setAttribute("open", "open");
  });

  function revealEmail() {
    const encodedEmail = "eW91ci5uZXcuZW1haWw=@rknzcyr.com"; // Result from encodeEmail()
    const email =
      atob(encodedEmail.split("@")[0]) +
      "@" +
      atob(y(encodedEmail.split("@")[1].split(".")[0])) +
      "." +
      encodedEmail.split(".")[1];

    const emailLink = document.createElement("a");
    emailLink.setAttribute("href", `mailto:${email}`);
    emailLink.innerText = email;

    reveal.replaceWith(emailLink);
  }

  function notInterested() {
    const notInterested = document.createElement("span");
    notInterested.innerText = "I am not interested in your email.";

    reveal.replaceWith(notInterested);
  }

  const yesButton = dialog.querySelector("#yes-button") as HTMLElement;
  const noButton = dialog.querySelector("#no-button") as HTMLElement;

  yesButton.addEventListener("click", () => {
    dialog.removeAttribute("open");

    localStorage.canSeeEmail = false;

    notInterested();
  });

  noButton.addEventListener("click", () => {
    dialog.removeAttribute("open");

    localStorage.canSeeEmail = true;

    revealEmail();
  });

  if (localStorage.canSeeEmail === "true") {
    revealEmail();
  } else if (localStorage.canSeeEmail === "false") {
    notInterested();
  }
})();
