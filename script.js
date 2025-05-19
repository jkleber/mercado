// ** IMPORTANTE: Substitua este URL pelo URL do seu Aplicativo Web Google Apps Script **
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzGGTUOW0JTWXIMd8gVYvhiGOr6gnD1gpVLWK_lZhtmTqHOkLKRHmFevSaOg0f0iCit/exec';

document.addEventListener('DOMContentLoaded', function () {
    const fabAddItemButton = document.getElementById('fabAddItem'); // FAB agora apenas abre o offcanvas
    const addItemButton = document.getElementById('addItemButton'); // Botão Adicionar Item no offcanvas
    const addCategoryButton = document.getElementById('addCategoryButton'); // Botão Adicionar Categoria no offcanvas
    const itemInput = document.getElementById('itemInput');
    const itemQuantityInput = document.getElementById('itemQuantity'); // Novo input de quantidade
    const categorySelect = document.getElementById('categorySelect');
    const newCategoryInput = document.getElementById('newCategoryInput');
    const newCategoryIconInput = document.getElementById('newCategoryIconInput');
    const emojiPickerButton = document.getElementById('emojiPickerButton');
    const emojiPicker = document.getElementById('emojiPicker');
    const shoppingList = document.getElementById('shoppingList');
    const clearBoughtButton = document.getElementById('clearBoughtButton'); // Botão Limpar Comprados
    const clearAllButton = document.getElementById('clearAllButton'); // Botão Limpar Tudo

    // Estado da aplicação - Agora será sincronizado com a planilha
    // As categorias podem ser mantidas localmente ou gerenciadas na planilha também,
    // dependendo da necessidade de compartilhamento das categorias em si.
    // Por simplicidade, mantemos a inicialização local das categorias por enquanto.
    let categories = [];
    let items = []; // Itens serão carregados da planilha

    // Lista de emojis para o picker
    const emojis = ['🍎', '🥦', '🥛', '🍖', '🍹', '🍞', '🍗', '🍇', '🍉', '🍌', '🍒', '🥕', '🥩', '🍤', '🍰', '🍪', '🍕', '🌽', '🍅', '🥥', '🛒', '🛍️', '📋', '📍']; // Adicionados alguns emojis relacionados

    // --- Funções de Interação com o Google Apps Script ---

    // Função para carregar a lista de compras da planilha
    async function fetchShoppingList() {
        try {
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'GET'
            });
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            const data = await response.json();
            items = data.items || []; // Assume que a resposta JSON tem um array 'items'
            console.log('Lista carregada:', items);
            renderList(); // Renderiza a lista após carregar
        } catch (error) {
            console.error('Erro ao carregar a lista:', error);
            // Opcional: Exibir uma mensagem de erro mais amigável para o usuário
            alert('Não foi possível carregar a lista de compras. Verifique a conexão e o URL do script.');
        }
    }

    // Função para enviar alterações para a planilha
    async function updateShoppingList(itemData, action) {
        try {
            // Realiza a requisição OPTIONS para o preflight
            await fetch(APPS_SCRIPT_URL, {
                method: 'OPTIONS',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
    
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: action,
                    item: itemData
                })
            });
    
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
    
            const result = await response.json();
            console.log('Resposta do Apps Script:', result);
    
            if (result.result === 'success') {
                fetchShoppingList();
            } else {
                console.error('Erro na operação:', result.message);
                alert('Ocorreu um erro ao salvar a alteração: ' + result.message);
                fetchShoppingList();
            }
        } catch (error) {
            console.error('Erro ao enviar dados para o Apps Script:', error);
            alert('Erro de conexão com o servidor. Verifique sua internet e o URL do script.');
            fetchShoppingList();
        }
    }


    // --- Funções de Local Storage (REMOVIDAS/IGNORADAS) ---
    // Não usaremos mais Local Storage, os dados virão da planilha.
    // function saveToLocalStorage() { ... }
    // function loadFromLocalStorage() { ... }


    // --- Renderização ---
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
        items.forEach(item => {
            if (!grouped[item.Categoria]) { // Use item.Categoria conforme os cabeçalhos da planilha
                grouped[item.Categoria] = [];
            }
            grouped[item.Categoria].push(item);
        });

        // Ordenar categorias (opcional, mas melhora a organização)
        const sortedCategories = Object.keys(grouped).sort();

        sortedCategories.forEach(categoryName => {
            // Encontra o ícone localmente para a categoria
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
            // Os itens carregados da planilha terão propriedades como ID, Nome, Quantidade, Categoria, Comprado
            grouped[categoryName].forEach((item) => { // Use 'item' aqui para o objeto do item
                const li = document.createElement('li');
                // Adiciona a classe 'bought' se o item estiver marcado como comprado na planilha
                li.className = `list-group-item d-flex justify-content-between align-items-center ${item.Comprado ? 'bought' : ''}`;


                // Conteúdo do item (checkbox, nome, quantidade)
                const itemContentDiv = document.createElement('div');
                itemContentDiv.className = 'list-item-content';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = item.Comprado; // Usa o status 'Comprado' da planilha
                checkbox.className = 'form-check-input';
                // Evento para marcar/desmarcar
                checkbox.addEventListener('change', async () => { // Adicione 'async' aqui
                    const newBoughtStatus = checkbox.checked;
                     const updatedItemData = {
                        ID: item.ID, // Passa o ID do item da planilha
                        Nome: item.Nome,
                        Quantidade: item.Quantidade,
                        Categoria: item.Categoria,
                        Comprado: newBoughtStatus // Novo status
                    };
                    // Atualiza o estado local temporariamente para feedback visual rápido
                     item.Comprado = newBoughtStatus;
                     li.classList.toggle('bought', newBoughtStatus); // Atualiza a classe visual
                    // Envia a atualização para a planilha
                    await updateShoppingList(updatedItemData, 'update'); // Use await
                    // fetchShoppingList() será chamado dentro de updateShoppingList após sucesso para sincronizar
                });

                const itemNameSpan = document.createElement('span');
                itemNameSpan.textContent = item.Nome; // Usa o nome da planilha
                itemNameSpan.className = 'item-name';

                const itemQuantitySpan = document.createElement('span');
                itemQuantitySpan.textContent = item.Quantidade > 1 ? `(${item.Quantidade})` : ''; // Usa a quantidade da planilha
                itemQuantitySpan.className = 'item-quantity';

                itemContentDiv.appendChild(checkbox);
                itemContentDiv.appendChild(itemNameSpan);
                 if (item.Quantidade > 1) {
                     itemContentDiv.appendChild(itemQuantitySpan);
                 }


                // Adicionar evento de clique no LI para marcar/desmarcar (ignora cliques nos botões)
                 li.addEventListener('click', async (e) => { // Adicione 'async' aqui
                    if (e.target === removeBtn || e.target === checkbox || removeBtn.contains(e.target)) {
                        return;
                    }
                    const newBoughtStatus = !checkbox.checked;
                     const updatedItemData = {
                        ID: item.ID, // Passa o ID do item da planilha
                        Nome: item.Nome,
                        Quantidade: item.Quantidade,
                        Categoria: item.Categoria,
                        Comprado: newBoughtStatus // Novo status
                    };
                     // Atualiza o estado local temporariamente para feedback visual rápido
                     item.Comprado = newBoughtStatus;
                     checkbox.checked = newBoughtStatus;
                     li.classList.toggle('bought', newBoughtStatus); // Atualiza a classe visual
                    // Envia a atualização para a planilha
                    await updateShoppingList(updatedItemData, 'update'); // Use await
                    // fetchShoppingList() será chamado dentro de updateShoppingList após sucesso para sincronizar
                });


                // Botão de Remover Item
                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn btn-danger btn-sm btn-item-remove';
                removeBtn.innerHTML = '&#128465;'; // Trash can emoji
                removeBtn.title = 'Remover item';
                removeBtn.addEventListener('click', async (event) => { // Adicione 'async' aqui
                     event.stopPropagation();
                     if (confirm(`Tem certeza que deseja remover "${item.Nome}"?`)) { // Usa o nome da planilha na confirmação
                         const itemDataToDelete = {
                             ID: item.ID // Passa o ID do item da planilha para deletar
                         };
                         // Envia a solicitação de exclusão para a planilha
                         await updateShoppingList(itemDataToDelete, 'delete'); // Use await
                         // fetchShoppingList() será chamado dentro de updateShoppingList após sucesso para sincronizar
                     }
                });

                li.appendChild(itemContentDiv);
                li.appendChild(removeBtn);
                shoppingList.appendChild(li);
            });
        });
         // Adiciona a classe 'bought' aos itens riscados (necessário para o estilo CSS)
         const boughtItems = shoppingList.querySelectorAll('.list-group-item.bought');
         boughtItems.forEach(itemElement => {
            // O CSS já lida com o riscado quando a classe 'bought' está presente
         });
    }

    // --- Event Listeners ---

    // Adicionar Item
    addItemButton.addEventListener('click', async (event) => { // Adicione 'async' aqui
        event.preventDefault();
        const name = itemInput.value.trim();
        const category = categorySelect.value;
        const quantity = parseInt(itemQuantityInput.value, 10) || 1;

        if (name && category) {
            // Crie um objeto com os dados do novo item (sem ID ainda, o script irá atribuir)
            const newItemData = {
                Nome: name, // Use os mesmos nomes dos cabeçalhos da planilha
                Quantidade: quantity,
                Categoria: category,
                Comprado: false // Novo item não está comprado
            };

            // Envie para o Apps Script com a ação 'add'
            await updateShoppingList(newItemData, 'add'); // Use await

            // Limpa os campos do formulário APENAS após o envio bem-sucedido
            itemInput.value = '';
            itemQuantityInput.value = '1';
            categorySelect.value = '';
            // A lista será renderizada automaticamente após o fetchShoppingList em updateShoppingList
        } else {
             alert('Por favor, insira o nome do item e selecione a categoria.');
        }
    });

     // Adicionar Categoria (mantido localmente por enquanto, pode ser adaptado para planilha)
    addCategoryButton.addEventListener('click', (event) => {
         event.preventDefault();
        const newCategory = newCategoryInput.value.trim();
        const newIcon = newCategoryIconInput.value.trim() || '📦';

        if (newCategory && !categories.some(c => c.name.toLowerCase() === newCategory.toLowerCase())) {
            categories.push({ name: newCategory, icon: newIcon });
            newCategoryInput.value = '';
            newCategoryIconInput.value = '';
            // Se as categorias fossem na planilha, você chamaria uma função updateCategories aqui
            // Em vez de saveToLocalStorage() que foi removido
            renderCategorySelect();
            alert(`Categoria "${newCategory}" adicionada com sucesso!`);
        } else if (newCategory) {
             alert(`A categoria "${newCategory}" já existe.`);
        } else {
             alert('Por favor, insira o nome da nova categoria.');
        }
    });


    // Toggle Emoji Picker
    emojiPickerButton.addEventListener('click', () => {
        if (emojiPicker.classList.contains('d-none')) {
            renderEmojiPicker();
            emojiPicker.classList.remove('d-none');
        } else {
            emojiPicker.classList.add('d-none');
        }
    });

    // Limpar Itens Comprados
    clearBoughtButton.addEventListener('click', async () => { // Adicione 'async' aqui
        // Envie para o Apps Script com a ação 'clearBought'
        await updateShoppingList(null, 'clearBought'); // Não precisa enviar dados do item
        // A lista será renderizada automaticamente após o fetchShoppingList em updateShoppingList
    });

    // Limpar Tudo
    clearAllButton.addEventListener('click', async () => { // Adicione 'async' aqui
         if (confirm('Tem certeza que deseja limpar a lista inteira?')) {
             // Envie para o Apps Script com a ação 'clearAll'
             await updateShoppingList(null, 'clearAll'); // Não precisa enviar dados do item
             // A lista será renderizada automaticamente após o fetchShoppingList em updateShoppingList
         }
    });


    // --- Inicialização ---
    // Carrega dados da planilha ao iniciar
    fetchShoppingList();
    // Inicializa as categorias localmente (se não estiverem na planilha)
    categories = [
         { name: 'Frutas', icon: '🍎' },
         { name: 'Verduras', icon: '🥦' },
         { name: 'Laticínios', icon: '🥛' },
         { name: 'Carnes', icon: '🍖' },
         { name: 'Bebidas', icon: '🍹' }
         // Adicione mais categorias iniciais aqui se desejar
     ];
    renderCategorySelect(); // Renderiza o select de categorias
    // renderList() é chamado dentro de fetchShoppingList após carregar os dados
});
