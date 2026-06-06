// Redireciona se o usuário já estiver logado
if (localStorage.getItem("token")) {
  window.location.href = "index.html";
}

const senhaInput = document.getElementById("senha");
const toggleSenha = document.getElementById("toggleSenha");
const form = document.getElementById("loginForm");
const erro = document.getElementById("erro");

toggleSenha.addEventListener("click", () => {
  if (senhaInput.type === "password") {
    senhaInput.type = "text";
    toggleSenha.textContent = "🙈";
  } else {
    senhaInput.type = "password";
    toggleSenha.textContent = "👁";
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const usuario = document.getElementById("usuario").value.trim();
  const senha = senhaInput.value;

  if (!usuario || !senha) {
    erro.textContent = "Preencha todos os campos!";
    return;
  }

  const btnLogin = form.querySelector(".btn-login");
  const textoOriginal = btnLogin.textContent;

  btnLogin.textContent = "Entrando...";
  btnLogin.disabled = true;
  erro.textContent = "";

  try {
    const response = await fetch("http://127.0.0.1:8000/api/login/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: usuario,
        password: senha
      })
    });

    if (!response.ok) {
      erro.textContent = "Usuário ou senha inválidos.";
      return;
    }

    const data = await response.json();

    localStorage.setItem("token", data.token);

    window.location.href = "index.html";

  } catch (err) {
    console.error(err);
    erro.textContent = "Não foi possível conectar ao servidor backend.";
  } finally {
    btnLogin.textContent = textoOriginal;
    btnLogin.disabled = false;
  }
});