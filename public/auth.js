import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, deleteDoc, setDoc, getDoc, updateDoc, Timestamp, collection, addDoc, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";


// Aqui você pode usar a função loadCode normalmente


let auth, db;

// Função para configurar o Firebase com as credenciais
const getFirebaseConfig = async () => {
    const response = await fetch('/firebase-config');
    const firebaseConfig = await response.json();
    return firebaseConfig;
};

getFirebaseConfig().then(firebaseConfig => {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);  // Atribuindo a variável global 'auth'
    db = getFirestore(app);  // Atribuindo a variável global 'db'

    // Função para definir o idioma preferido do usuário no Firestore
    const setUserLanguagePreference = async (userId, language) => {
        try {
            await setDoc(doc(db, "codenotepro", userId), { language }, { merge: true });
        } catch (error) {
            console.error("Erro ao definir a preferência de idioma:", error);
        }
    };

    // Função para obter o idioma preferido do usuário no Firestore
    const getUserLanguagePreference = async (userId) => {
        try {
            const userDoc = await getDoc(doc(db, "codenotepro", userId));
            return userDoc.exists() ? userDoc.data().language : null;
        } catch (error) {
            console.error("Erro ao obter a preferência de idioma:", error);
            return null;
        }
    };

    // Função para atualizar o texto do botão de login/logout com base no idioma
    const updateLoginButtonText = (isAuthenticated, language) => {
        const translations = {
            en: { login: "Login", logout: "Logout" },
            pt: { login: "Entrar", logout: "Sair" },
            es: { login: "Iniciar sesión", logout: "Cerrar sesión" },
            hi: { login: "लॉगिन", logout: "लॉग आउट" },
            zh: { login: "登录", logout: "登出" },
            ar: { login: "تسجيل الدخول", logout: "تسجيل الخروج" }
        };
        const text = isAuthenticated ? translations[language]?.logout : translations[language]?.login;
        const loginButton = document.getElementById("loginButton");

        if (loginButton) {
            loginButton.textContent = text || "Entrar"; // Atualiza o texto do botão
        }

        // Alterar o comportamento de exibição do botão (visibilidade, cor, etc.)
        if (isAuthenticated) {
            loginButton.classList.remove("btn-login");
            loginButton.classList.add("btn-logout");
        } else {
            loginButton.classList.remove("btn-logout");
            loginButton.classList.add("btn-login");
        }
    };
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await updateUIBasedOnAuth(user);  // Atualiza a interface com as informações do usuário logado
            await loadCodeHistory(user);      // Carrega o histórico de código do usuário após o login
        } else {
            await updateUIBasedOnAuth(null);  // Atualiza a interface para o estado de "não autenticado"
            console.log("Usuário não autenticado.");
            displayCodeHistory([]);  // Exibe uma lista vazia de histórico de código
        }
    });

    // Função de atualização da UI baseada no estado de autenticação
    const updateUIBasedOnAuth = async (user) => {
        const isAuthenticated = !!user;
        const language = isAuthenticated ? await getUserLanguagePreference(user.uid) : "pt"; // Idioma padrão

        updateLoginButtonText(isAuthenticated, language);

        if (isAuthenticated) {
            // Exibe o nome do usuário
            const usernameDisplay = document.getElementById("usernameDisplay");
            if (usernameDisplay) {
                usernameDisplay.textContent = user.displayName || "Usuário";
            }

            // Exibe o status Premium
            const premiumStatus = document.getElementById("premiumStatus");
            if (premiumStatus) {
                const isPremium = await checkPremiumStatus(user);
                premiumStatus.textContent = isPremium ? "Status Premium: Ativo" : "Status Premium: Expirado";
            }
        }

        // Fecha o modal de login, se o usuário estiver autenticado
        const loginModal = document.getElementById("loginModal");
        if (loginModal) {
            loginModal.classList.add("hidden");
        }

        if (!isAuthenticated) {
            const loginModal = document.getElementById("loginModal");
            if (loginModal) {
                loginModal.classList.remove("hidden");
            }
        }
    };


    // Listener para mudança de idioma
    document.querySelectorAll("#languageSelector, #languageSelectorMobile").forEach((selector) => {
        selector.addEventListener("change", async (event) => {
            const language = event.target.value;
            const user = auth.currentUser;

            if (user) {
                await setUserLanguagePreference(user.uid, language); // Salva a preferência no Firestore
            }

            updateLoginButtonText(!!user, language); // Atualiza o texto do botão
        });
    });

    // Função para definir status premium com 3 dias gratuitos ao novo usuário
    const setPremiumStatus = async (userId) => {
        const premiumExpiryDate = new Date();
        premiumExpiryDate.setDate(premiumExpiryDate.getDate() + 3); // Adiciona 3 dias
        await setDoc(doc(db, "codenotepro", userId), {
            isPremium: true,
            premiumExpiry: Timestamp.fromDate(premiumExpiryDate)
        }, { merge: true });
    };

    // Função para verificar e atualizar o status premium após o login
    const checkPremiumStatus = async (user) => {
        const userRef = doc(db, "codenotepro", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            const currentTime = Timestamp.now();
            // Se o período premium tiver expirado, atualiza o status para falso
            if (userData.isPremium && userData.premiumExpiry.toDate() < currentTime.toDate()) {
                await updateDoc(userRef, { isPremium: false });
                return false; // Premium expirou
            }
            return userData.isPremium; // Retorna o status atual
        }
        return false; // Retorna falso se o documento não existir
    };

    // Função para criar histórico de código para o usuário
    const createCodeHistorySubcollection = async (userId) => {
        const codeHistoryRef = collection(db, "codenotepro", userId, "codeHistory");
        await addDoc(codeHistoryRef, {
            htmlContent: "<!-- Código HTML inicial -->",
            cssContent: "/* Código CSS inicial */",
            jsContent: "// Código JavaScript inicial",
            createdAt: Timestamp.now()
        });
    };

    // Cadastro do usuário
    document.getElementById("registerButton").addEventListener("click", async function () {
        const email = document.getElementById("registerEmail").value.trim();
        const username = document.getElementById("user").value.trim();
        const password = document.getElementById("registerPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const errorMessageRegister = document.getElementById("errorMessageRegister");

        errorMessageRegister.textContent = "";
        errorMessageRegister.classList.add("hidden");

        if (password !== confirmPassword) {
            errorMessageRegister.textContent = "As senhas não correspondem.";
            errorMessageRegister.classList.remove("hidden");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const userId = userCredential.user.uid;

            await setDoc(doc(db, "codenotepro", userId), {
                email,
                username,
                createdAt: new Date(),
                language: "pt" // Define o idioma padrão como português
            });

            // Configura status premium de 3 dias
            await setPremiumStatus(userId);

            // Cria a subcoleção codeHistory para o usuário
            await createCodeHistorySubcollection(userId);

            await updateUIBasedOnAuth(userCredential.user);
            document.getElementById("loginModal").classList.add("hidden");
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                errorMessageRegister.textContent = "Email já cadastrado.";
            } else if (error.code === 'auth/weak-password') {
                errorMessageRegister.textContent = "A senha é muito fraca.";
            } else {
                errorMessageRegister.textContent = error.message;
            }
            errorMessageRegister.classList.remove("hidden");
        }
    });

    // Login do usuário
    document.getElementById("loginSubmit").addEventListener("click", async function () {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const errorMessage = document.getElementById("errorMessage");

        errorMessage.textContent = "";
        errorMessage.classList.add("hidden");

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            // Verifica e atualiza o status premium, se necessário
            const isPremium = await checkPremiumStatus(userCredential.user);
            console.log("Status Premium:", isPremium);

            await updateUIBasedOnAuth(userCredential.user);

            // Verifica se o modal existe antes de tentar fechá-lo
            const loginModal = document.getElementById("loginModal");
            if (loginModal) {
                loginModal.classList.add("hidden");
            }

        } catch (error) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                errorMessage.textContent = "Credenciais inválidas.";
            } else {
                errorMessage.textContent = error.message;
            }
            errorMessage.classList.remove("hidden");
        }
    });

    // Logout do usuário
    document.getElementById("loginButton").addEventListener("click", async () => {
        await signOut(auth);  // Realiza o logout
        await updateUIBasedOnAuth(null);  // Atualiza a interface (UI) após o logout
    });


    // Carregar histórico de códigos do Firestore
    const loadCodeHistory = async (user) => {
        const codeHistoryRef = collection(db, "codenotepro", user.uid, "codeHistory");
        const q = query(codeHistoryRef, orderBy("createdAt", "desc"), limit(5)); // Carregar os 5 últimos registros
        const querySnapshot = await getDocs(q);
        const history = querySnapshot.docs.map(doc => ({
            id: doc.id, // Inclui o id do documento para referência
            createdAt: doc.data().createdAt // Pega a data de criação para exibição
        }));
        displayCodeHistory(history); // Chama a função para exibir o histórico no frontend
    };
    


    const displayCodeHistory = (history) => {
        const historyList = document.getElementById("historyList");
        if (historyList) {
            historyList.innerHTML = "";
            history.forEach(item => {
                const createdAt = item.createdAt.toDate();
                const formattedDate = createdAt.toLocaleString('pt-BR', {
                    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });
    
                const listItem = document.createElement("li");
                // Classes Tailwind para estilização
                listItem.classList.add(
                    "flex",          // Torna o item flexbox para alinhar os elementos
                    "items-center",  // Alinha verticalmente ao centro
                    "justify-between",// Distribui o espaço horizontalmente
                    "bg-white",
                    "p-4",
                    "rounded-lg",
                    "shadow",
                    "mb-2"          // Adiciona uma pequena margem inferior entre os itens
                );
    
                listItem.innerHTML = `
                    <span class="text-gray-500 text-sm">${formattedDate}</span>
                    <button class="bg-[#f97316] text-white py-1 px-4 rounded hover:bg-[#ea580c]" data-code-id="${item.id}">Carregar</button>
                `;
    
                listItem.querySelector('button').addEventListener('click', function() {
                    loadCode(this.dataset.codeId);
                });
    
                historyList.appendChild(listItem);
            });
        } else {
            console.error("Elemento 'historyList' não encontrado no DOM.");
        }
    };
    


    // Função para carregar código no editor
    const loadCode = async (codeId) => {
        // Pegando o documento do código salvo com o ID
        const codeDocRef = doc(db, "codenotepro", auth.currentUser.uid, "codeHistory", codeId);
        const codeDoc = await getDoc(codeDocRef);
    
        if (codeDoc.exists()) {
            const data = codeDoc.data();
    
            // Preenchendo os campos de texto com o conteúdo salvo
            document.getElementById("html").value = data.htmlContent || "";
            document.getElementById("css").value = data.cssContent || "";
            document.getElementById("js").value = data.jsContent || "";
        } else {
            console.log("Código não encontrado!");
        }
    };
    
    
    

    // Inicializa a UI com base no estado de autenticação
    initializeHistoryLoader();
});
