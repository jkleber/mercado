// Este script usa o Firebase Realtime Database para armazenar e sincronizar a lista de compras.
// Certifique-se de que o Firebase SDK (firebase-app.js, firebase-database.js)
// e suas configurações (firebaseConfig) estejam incluídos no seu arquivo index.html
// em tags <script> ANTES deste script.

document.addEventListener('DOMContentLoaded', function () {
    // --- Referências aos Elementos HTML ---
    const fabAddItemButton = document.getElementById('fabAddItem'); // FAB que abre o offcanvas
    const addItemButton = document.getElementById('addItemButton'); // Botão Adicionar Item no offcanvas
    const addCategoryButton = document.getElementById('addCategoryButton'); // Botão Adicionar Categoria no offcanvas
    const itemInput = document.getElementById('itemInput');
    const itemQuantityInput = document.getElementById('itemQuantity'); // Input de quantidade
    const categorySelect = document.getElementById('categorySelect');
    const newCategoryInput = document.getElementById('newCategoryInput');
    const newCategoryIconInput = document.getElementById('newCategoryIconInput');
    const emojiPickerButton = document.getElementById('emojiPickerButton');
    const emojiPicker = document.getElementById('emojiPicker');
    const shoppingList = document.getElementById('shoppingList');
    const clearBoughtButton = document.getElementById('clearBoughtButton'); // Botão Limpar Comprados
    const clearAllButton = document.getElementById('clearAllButton'); // Botão Limpar Tudo

    // --- Estado da Aplicação ---
    // As categorias são mantidas localmente por enquanto.
    let categories = [];
    // Os itens serão carregados e sincronizados automaticamente pelo Firebase.
    let items = [];

    // Lista de emojis para o picker
    const emojis = ['🍎', '🥦', '🥛', '🍖', '🍹', '🍞', '🍗', '🍇', '🍉', '🍌', '🍒', '🥕', '🥩', '🍤', '🍰', '🍪', '🍕', '🌽', '🍅', '🥥', '🛒', '🛍️', '📋', '📍']; // Adicionados alguns emojis relacionados

    // --- Inicialização e Conexão com Firebase ---

    // Verifica se o Firebase SDK e as referências foram carregados no index.html
    if (typeof firebase === 'undefined' || typeof database === 'undefined' || typeof itemsRef === 'undefined') {
        console.error("Firebase SDK ou referências de banco de dados não carregadas corretamente no index.html.");
        alert("Erro na configuração do Firebase. Verifique o arquivo index.html.");
        return; // Interrompe a execução se o Firebase não estiver pronto
    }

    // 'itemsRef' é a referência ao nó 'items' no seu Realtime Database,
    // definida no script do index.html após inicializar o Firebase.
    // Exemplo de como seria definido no index.html:
    // const database = firebase.database();
    // const itemsRef = database.ref('items');


    // --- Sincronização em Tempo Real com Firebase ---

    // Ouve mudanças nos dados no nó 'items' em tempo real
    // Esta função é acionada na carga inicial e sempre que os dados mudam no Firebase.
    itemsRef.on('value', (snapshot) => {
        const data = snapshot.val(); // Obtém os dados do nó 'items' como um objeto
        items = []; // Limpa a lista local para recarregar

        if (data) {
            // O Firebase retorna os dados como um objeto de objetos (chave: valor).
            // Precisamos convertê-lo de volta para um array de objetos para usar na nossa lista.
            // As chaves do objeto (geradas pelo Firebase push) serão usadas como IDs únicos.
            Object.keys(data).forEach(key => {
                items.push({
                    id: key, // Usa a chave do Firebase como ID único do item
                    ...data[key] // Adiciona as outras propriedades do item (Nome, Quantidade, Categoria, Comprado)
                });
            });
        }

        console.log('Dados do Firebase recebidos:', items);
        renderList(); // Renderiza a lista na UI com os dados mais recentes
    }, (error) => {
        // Lida com erros de sincronização
        console.error("Erro ao sincronizar com Firebase:", error);
        alert("Erro ao carregar ou sincronizar a lista de compras.");
    });


    // --- Funções de Interação com Firebase ---

    /**
     * Adiciona um novo item ao Firebase Realtime Database.
     * @param {object} itemData - Objeto contendo os dados do item (Nome, Quantidade, Categoria, Comprado).
     */
    async function addItemToFirebase(itemData) {
        try {
            // 'push()' cria uma nova chave única sob 'itemsRef' e adiciona os dados.
            // Retorna uma Promise que resolve com a referência do novo item.
            const newItemRef = await push(itemsRef, itemData);
            console.log("Item adicionado ao Firebase com ID:", newItemRef.key);
            // A UI será atualizada automaticamente pela função itemsRef.on('value', ...)
        } catch (error) {
            console.error("Erro ao adicionar item ao Firebase:", error);
            alert("Erro ao adicionar item à lista.");
        }
    }

    /**
     * Atualiza dados de um item existente no Firebase.
     * @param {string} itemId - O ID (chave) do item no Firebase.
     * @param {object} updatedData - Objeto contendo os dados a serem atualizados (ex: { Comprado: true }).
     */
    async function updateItemInFirebase(itemId, updatedData) {
         try {
             // Obtém uma referência ao item específico usando seu ID (child(itemId))
             const itemRef = ref(database, 'items/' + itemId);
             // Atualiza os dados do item
             await update(itemRef, updatedData);
             console.log("Item atualizado no Firebase com ID:", itemId);
             // A UI será atualizada automaticamente pela função itemsRef.on('value', ...)
         } catch (error) {
             console.error("Erro ao atualizar item no Firebase:", error);
             alert("Erro ao atualizar item na lista.");
         }
    }

    /**
     * Remove um item do Firebase.
     * @param {string} itemId - O ID (chave) do item no Firebase.
     */
    async function removeItemFromFirebase(itemId) {
         try {
             // Obtém uma referência ao item específico usando seu ID
             const itemRef = ref(database, 'items/' + itemId);
             // Remove o item
             await remove(itemRef);
             console.log("Item removido do Firebase com ID:", itemId);
             // A UI será atualizada automaticamente pela função itemsRef.on('value', ...)
         } catch (error) {
             console.error("Erro ao remover item do Firebase:", error);
             alert("Erro ao remover item da lista.");
         }
    }

    /**
     * Remove todos os itens marcados como 'Comprado' do Firebase.
     */
    async function clearBoughtFromFirebase() {
         try {
             // Para limpar comprados, precisamos iterar sobre os itens locais (que já estão sincronizados)
             // e criar um objeto de atualizações para remover no Firebase.
             const updates = {};
             items.forEach(item => {
                 if (item.Comprado) { // Verifica a propriedade 'Comprado' do item
                     updates[item.id] = null; // Definir como null remove o item no Firebase
                 }
             });

             if (Object.keys(updates).length > 0) {
                 // Executa as remoções em lote usando update no nó pai
                 await update(itemsRef, updates);
                 console.log("Itens comprados limpos do Firebase.");
                  // A UI será atualizada automaticamente pela função itemsRef.on('value', ...)
             } else {
                 alert('Não há itens comprados para remover.');
             }

         } catch (error) {
             console.error("Erro ao limpar itens comprados do Firebase:", error);
             alert("Erro ao limpar itens comprados.");
         }
    }

     /**
     * Remove todos os itens do Firebase.
     */
    async function clearAllFromFirebase() {
         try {
             // Remove todo o nó 'items' no Firebase
             await remove(itemsRef);
             console.log("Todos os itens limpos do Firebase.");
             // A UI será atualizada automaticamente pela função itemsRef.on('value', ...)
         } catch (error) {
             console.error("Erro ao limpar todos os itens do Firebase:", error);
             alert("Erro ao limpar a lista inteira.");
         }
    }


    // --- Funções de Renderização da UI ---
    // Estas funções permanecem as mesmas, pois trabalham com o array 'items' local,
    // que é mantido atualizado pela sincronização do Firebase.

    function renderCategorySelect() {
        categorySelect.innerHTML = '<option value="" disabled selected>Selecione a categoria</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
    }

    function renderEmojiPicker() {
        emojiPicker.innerHTML = '';
        emojis.forEach(emoji => {
            const span = document.createElement('span');
            span.textContent = emoji;
            span.addEventListener('click', () => {
                newCategoryIconInput.value = emoji;
                emojiPicker.classList.add('d-none');
            });
            emojiPicker.appendChild(span);
        });
    }

    function renderList() {
        shoppingList.innerHTML = '';
        const grouped = {};

        // Agrupar itens por categoria
        // Note que os itens do Firebase agora têm uma propriedade 'id' e as propriedades de dados (Nome, Quantidade, Categoria, Comprado)
        items.forEach(item => {
            // Usa a propriedade 'Categoria' do item carregado do Firebase
            if (!grouped[item.Categoria]) {
                grouped[item.Categoria] = [];
            }
            grouped[item.Categoria].push(item);
        });

        // Ordenar categorias (opcional, mas melhora a organização)
        const sortedCategories = Object.keys(grouped).sort();

        sortedCategories.forEach(categoryName => {
            // Encontra o ícone localmente para a categoria (assumindo que categorias são locais por enquanto)
            const category = categories.find(c => c.name === categoryName);
            const icon = category ? category.icon : '📦'; // Ícone padrão se não encontrar a categoria localmente

            // Cabeçalho da Categoria
            const header = document.createElement('li');
            header.className = 'list-group-item active d-flex align-items-center';
            header.style.justifyContent = 'space-between';

            const headerLeft = document.createElement('div');
            headerLeft.className = 'd-flex align-items-center';

            const iconSpan = document.createElement('span');
            iconSpan.textContent = icon;
            iconSpan.style.fontSize = '1.5rem';
            iconSpan.style.marginRight = '10px';

            const textSpan = document.createElement('span');
            textSpan.textContent = categoryName;

            headerLeft.appendChild(iconSpan);
            headerLeft.appendChild(textSpan);
            header.appendChild(headerLeft);

            shoppingList.appendChild(header);

            // Itens da Categoria
            grouped[categoryName].forEach((item) => {
                const li = document.createElement('li');
                // Adiciona a classe 'bought' se o item estiver marcado como comprado no Firebase
                li.className = `list-group-item d-flex justify-content-between align-items-center ${item.Comprado ? 'bought' : ''}`;


                // Conteúdo do item (checkbox, nome, quantidade)
                const itemContentDiv = document.createElement('div');
                itemContentDiv.className = 'list-item-content';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = item.Comprado; // Usa o status 'Comprado' do Firebase
                checkbox.className = 'form-check-input';
                // Evento para marcar/desmarcar
                checkbox.addEventListener('change', async () => {
                    const newBoughtStatus = checkbox.checked;
                     const updatedData = {
                        Comprado: newBoughtStatus // Atualiza apenas o status de comprado no Firebase
                    };
                    // Atualiza o estado local temporariamente para feedback visual rápido
                     item.Comprado = newBoughtStatus;
                     li.classList.toggle('bought', newBoughtStatus); // Atualiza a classe visual
                    // Envia a atualização para o Firebase
                    await updateItemInFirebase(item.id, updatedData); // Use await e o ID do item do Firebase
                    // A lista será atualizada automaticamente na UI pela função itemsRef.on('value', ...)
                });

                const itemNameSpan = document.createElement('span');
                itemNameSpan.textContent = item.Nome; // Usa o nome do item do Firebase
                itemNameSpan.className = 'item-name';

                const itemQuantitySpan = document.createElement('span');
                itemQuantitySpan.textContent = item.Quantidade > 1 ? `(${item.Quantidade})` : ''; // Usa a quantidade do item do Firebase
                itemQuantitySpan.className = 'item-quantity';

                itemContentDiv.appendChild(checkbox);
                itemContentDiv.appendChild(itemNameSpan);
                 if (item.Quantidade > 1) {
                     itemContentDiv.appendChild(itemQuantitySpan);
                 }


                // Adicionar evento de clique no LI para marcar/desmarcar (ignora cliques nos botões)
                 li.addEventListener('click', async (e) => {
                    // Impede que o clique no LI acione o evento se for nos botões ou checkbox
                    if (e.target === removeBtn || e.target === checkbox || removeBtn.contains(e.target)) {
                        return;
                    }
                    const newBoughtStatus = !checkbox.checked;
                     const updatedData = {
                        Comprado: newBoughtStatus // Atualiza apenas o status de comprado no Firebase
                    };
                     // Atualiza o estado local temporariamente para feedback visual rápido
                     item.Comprado = newBoughtStatus;
                     checkbox.checked = newBoughtStatus;
                     li.classList.toggle('bought', newBoughtStatus); // Atualiza a classe visual
                    // Envia a atualização para o Firebase
                    await updateItemInFirebase(item.id, updatedData); // Use await e o ID do item do Firebase
                    // A lista será atualizada automaticamente na UI pela função itemsRef.on('value', ...)
                });


                // Botão de Remover Item
                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn btn-danger btn-sm btn-item-remove';
                removeBtn.innerHTML = '&#128465;'; // Trash can emoji
                removeBtn.title = 'Remover item';
                removeBtn.addEventListener('click', async (event) => {
                     event.stopPropagation(); // Impede que o clique no botão propague para o LI
                     if (confirm(`Tem certeza que deseja remover "${item.Nome}"?`)) { // Usa o nome do item do Firebase na confirmação
                         // Envia a solicitação de exclusão para o Firebase
                         await removeItemFromFirebase(item.id); // Use await e o ID do item do Firebase
                         // A lista será atualizada automaticamente na UI pela função itemsRef.on('value', ...)
                     }
                });

                li.appendChild(itemContentDiv);
                li.appendChild(removeBtn);
                shoppingList.appendChild(li);
            });
        });
         // Adiciona a classe 'bought' aos itens riscados (necessário para o estilo CSS)
         // O CSS já lida com o riscado quando a classe 'bought' está presente nos elementos LI.
    }

    // --- Event Listeners ---

    // Adicionar Item
    addItemButton.addEventListener('click', async (event) => {
        event.preventDefault(); // Previne o envio padrão do formulário
        const name = itemInput.value.trim();
        const category = categorySelect.value;
        const quantity = parseInt(itemQuantityInput.value, 10) || 1;

        if (name && category) {
            // Crie um objeto com os dados do novo item (sem ID, o Firebase irá gerar)
            const newItemData = {
                Nome: name, // Use as mesmas chaves que você quer no Firebase (Nome, Quantidade, Categoria, Comprado)
                Quantidade: quantity,
                Categoria: category,
                Comprado: false // Novo item não está comprado
            };

            // Envie para o Firebase
            await addItemToFirebase(newItemData); // Use await para esperar a operação

            // Limpa os campos do formulário APENAS após o envio bem-sucedido
            itemInput.value = '';
            itemQuantityInput.value = '1';
            categorySelect.value = '';
            // A lista será renderizada automaticamente pela função itemsRef.on('value', ...)
        } else {
             alert('Por favor, insira o nome do item e selecione a categoria.');
        }
    });

     // Adicionar Categoria (mantido localmente por enquanto)
     // Se você quiser categorias compartilhadas, precisaria de outro nó no Firebase ('categories')
     // e lógica para adicionar/remover/sincronizar essas categorias também.
    addCategoryButton.addEventListener('click', (event) => {
         event.preventDefault(); // Previne o envio padrão do formulário
        const newCategory = newCategoryInput.value.trim();
        const newIcon = newCategoryIconInput.value.trim() || '📦';

        if (newCategory && !categories.some(c => c.name.toLowerCase() === newCategory.toLowerCase())) {
            categories.push({ name: newCategory, icon: newIcon });
            newCategoryInput.value = '';
            newCategoryIconInput.value = '';
            // Se as categorias fossem no Firebase, você chamaria uma função para adicionar/atualizar o nó 'categories' aqui
            renderCategorySelect(); // Atualiza o dropdown local
            alert(`Categoria "${newCategory}" adicionada com sucesso! (Localmente)`); // Mensagem indica que é local
        } else if (newCategory) {
             alert(`A categoria "${newCategory}" já existe.`);
        } else {
             alert('Por favor, insira o nome da nova categoria.');
        }
    });


    // Toggle Emoji Picker
    emojiPickerButton.addEventListener('click', () => {
        if (emojiPicker.classList.contains('d-none')) {
            renderEmojiPicker(); // Renderiza o picker antes de mostrar
            emojiPicker.classList.remove('d-none');
        } else {
            emojiPicker.classList.add('d-none');
        }
    });

    // Limpar Itens Comprados
    clearBoughtButton.addEventListener('click', async () => {
        if (confirm('Tem certeza que deseja remover todos os itens comprados?')) {
            await clearBoughtFromFirebase(); // Chama a função para limpar no Firebase
             // A lista será renderizada automaticamente pela função itemsRef.on('value', ...)
        }
    });

    // Limpar Tudo
    clearAllButton.addEventListener('click', async () => {
         if (confirm('Tem certeza que deseja limpar a lista inteira?')) {
             await clearAllFromFirebase(); // Chama a função para limpar tudo no Firebase
             // A lista será renderizada automaticamente pela função itemsRef.on('value', ...)
         }
    });


    // --- Inicialização ---
    // A sincronização com o Firebase é iniciada automaticamente pela função itemsRef.on('value', ...)
    // que é configurada no início deste script.
    // Não precisamos chamar uma função de 'carregar' explicitamente aqui.

    // Inicializa as categorias localmente (se não estiverem no Firebase)
    categories = [
         { name: 'Frutas', icon: '🍎' },
         { name: 'Verduras', icon: '🥦' },
         { name: 'Laticínios', icon: '🥛' },
         { name: 'Carnes', icon: '🍖' },
         { name: 'Bebidas', icon: '🍹' }
         // Adicione mais categorias iniciais aqui se desejar
     ];
    renderCategorySelect(); // Renderiza o select de categorias
    // renderList() é chamado pela função de sincronização do Firebase quando os dados são carregados inicialmente e em cada mudança.

});
