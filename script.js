// Este script usa o Firebase Realtime Database (SDK v8) para armazenar e sincronizar a lista de compras.
// Certifique-se de que o Firebase SDK (firebase-app.js, firebase-database.js v8.x.x)
// e suas configurações (firebaseConfig) estejam incluídos no seu arquivo index.html
// em tags <script> ANTES deste script.
// O index.html deve inicializar o app Firebase e criar as referências 'database' e 'itemsRef'.

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
    const categoryManagementList = document.getElementById('categoryManagementList'); // Lista de gerenciamento de categorias
    const searchInput = document.getElementById('searchInput'); // Campo de busca desktop
    const searchInputMobile = document.getElementById('searchInputMobile'); // Campo de busca mobile
    const filterButtons = document.querySelectorAll('.filter-btn'); // Botões de filtro
    
    // Elementos do modal de edição de categoria
    const editCategoryModal = document.getElementById('editCategoryModal');
    const editCategoryForm = document.getElementById('editCategoryForm');
    const editCategoryOldName = document.getElementById('editCategoryOldName');
    const editCategoryName = document.getElementById('editCategoryName');
    const editCategoryIcon = document.getElementById('editCategoryIcon');
    const editEmojiPickerButton = document.getElementById('editEmojiPickerButton');
    const editEmojiPicker = document.getElementById('editEmojiPicker');
    const saveCategoryChanges = document.getElementById('saveCategoryChanges');
    
    // Elementos do modal de exclusão de categoria
    const deleteCategoryModal = document.getElementById('deleteCategoryModal');
    const deleteCategoryName = document.getElementById('deleteCategoryName');
    const deleteOptionRemove = document.getElementById('deleteOptionRemove');
    const deleteOptionMove = document.getElementById('deleteOptionMove');
    const moveToCategory = document.getElementById('moveToCategory');
    const moveToSelect = document.getElementById('moveToSelect');
    const confirmDeleteCategory = document.getElementById('confirmDeleteCategory');
    
    // Inicializa os modais do Bootstrap
    const editCategoryModalInstance = new bootstrap.Modal(editCategoryModal);
    const deleteCategoryModalInstance = new bootstrap.Modal(deleteCategoryModal);

    // --- Estado da Aplicação ---
    // As categorias são mantidas localmente por enquanto.
    let categories = [];
    // Os itens serão carregados e sincronizados automaticamente pelo Firebase.
    let items = [];
    // Estado atual do filtro
    let currentFilter = 'all';
    // Termo de busca atual
    let searchTerm = '';
    // Instância do Sortable para reordenação de categorias
    let sortableInstance = null;

    // Lista de emojis para o picker
    const emojis = ['🍎', '🥦', '🥛', '🍖', '🍹', '🍞', '🍗', '🍇', '🍉', '🍌', '🍒', '🥕', '🥩', '🍤', '🍰', '🍪', '🍕', '🌽', '🍅', '🥥', '🛒', '🛍️', '📋', '📍', '🧀', '🥚', '🥓', '🥖', '🥐', '🧈', '🧂', '🥫', '🥔', '🍠', '🍯', '🥜', '🫘', '🍝', '🥞', '🧊', '🧃', '🧴', '🧻', '🧼', '🧹', '🧺', '🪣', '🧷', '🪒', '🪥', '🧸', '📱', '💻', '🔋', '💡', '🧾']; // Emojis relacionados a produtos de supermercado

    // --- Inicialização e Conexão com Firebase ---

    // Verifica se o Firebase SDK e as referências foram carregados no index.html
    // 'database' e 'itemsRef' devem ser definidos no index.html antes deste script.
    if (typeof firebase === 'undefined' || typeof database === 'undefined' || typeof itemsRef === 'undefined') {
        console.error("Firebase SDK ou referências de banco de dados não carregadas corretamente no index.html.");
        showToast("Erro", "Erro na configuração do Firebase. Verifique o arquivo index.html.", "danger");
        return; // Interrompe a execução se o Firebase não estiver pronto
    }

    // 'itemsRef' é a referência ao nó 'items' no seu Realtime Database,
    // definida no script do index.html após inicializar o Firebase.
    // Exemplo de como seria definido no index.html:
    // const database = firebase.database();
    // const itemsRef = database.ref('items');


    // --- Sincronização em Tempo Real com Firebase ---

    // Ouve mudanças nos dados no nó 'items' em tempo real (Sintaxe v8)
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
        renderCategoryManagement(); // Atualiza contadores de itens por categoria
    }, (error) => {
        // Lida com erros de sincronização
        console.error("Erro ao sincronizar com Firebase:", error);
        showToast("Erro", "Erro ao carregar ou sincronizar a lista de compras.", "danger");
    });


    // --- Funções de Interação com Firebase (Sintaxe v8) ---

    /**
     * Adiciona um novo item ao Firebase Realtime Database.
     * @param {object} itemData - Objeto contendo os dados do item (Nome, Quantidade, Categoria, Comprado).
     */
    async function addItemToFirebase(itemData) {
        if (typeof itemsRef === 'undefined') {
             console.error("Referência do Firebase itemsRef não definida.");
             showToast("Erro", "Erro interno: Firebase não configurado corretamente.", "danger");
             return;
        }
        try {
            // Sintaxe v8: itemsRef.push()
            const newItemRef = await itemsRef.push(itemData);
            console.log("Item adicionado ao Firebase com ID:", newItemRef.key);
            showToast("Sucesso", "Item adicionado à lista.", "success");
            // A UI será atualizada automaticamente pela função itemsRef.on('value', ...)
        } catch (error) {
            console.error("Erro ao adicionar item ao Firebase:", error);
            showToast("Erro", "Erro ao adicionar item à lista.", "danger");
        }
    }

    /**
     * Atualiza dados de um item existente no Firebase.
     * @param {string} itemId - O ID (chave) do item no Firebase.
     * @param {object} updatedData - Objeto contendo os dados a serem atualizados (ex: { Comprado: true }).
     */
    async function updateItemInFirebase(itemId, updatedData) {
         if (typeof itemsRef === 'undefined') {
             console.error("Referência do Firebase itemsRef não definida.");
             showToast("Erro", "Erro interno: Firebase não configurado corretamente.", "danger");
             return;
        }
         try {
             // Sintaxe v8: itemsRef.child(itemId).update()
             await itemsRef.child(itemId).update(updatedData);
             console.log("Item atualizado no Firebase com ID:", itemId);
             // A UI será atualizada automaticamente pela função itemsRef.on('value', ...)
         } catch (error) {
             console.error("Erro ao atualizar item no Firebase:", error);
             showToast("Erro", "Erro ao atualizar item na lista.", "danger");
         }
    }

    /**
     * Remove um item do Firebase.
     * @param {string} itemId - O ID (chave) do item no Firebase.
     */
    async function removeItemFromFirebase(itemId) {
         if (typeof itemsRef === 'undefined') {
             console.error("Referência do Firebase itemsRef não definida.");
             showToast("Erro", "Erro interno: Firebase não configurado corretamente.", "danger");
             return;
        }
         try {
             // Sintaxe v8: itemsRef.child(itemId).remove()
             await itemsRef.child(itemId).remove();
             console.log("Item removido do Firebase com ID:", itemId);
             // A UI será atualizada automaticamente pela função itemsRef.on('value', ...)
         } catch (error) {
             console.error("Erro ao remover item do Firebase:", error);
             showToast("Erro", "Erro ao remover item da lista.", "danger");
         }
    }

    /**
     * Remove todos os itens marcados como 'Comprado' do Firebase.
     */
    async function clearBoughtFromFirebase() {
         if (typeof itemsRef === 'undefined') {
             console.error("Referência do Firebase itemsRef não definida.");
             showToast("Erro", "Erro interno: Firebase não configurado corretamente.", "danger");
             return;
        }
         try {
             // Para limpar comprados, precisamos iterar sobre os itens locais (que já estão sincronizados)
             // e criar um objeto de atualizações para remover no Firebase.
             const updates = {};
             items.forEach(item => {
                 if (item.Comprado) { // Verifica a propriedade 'Comprado' do item
                     // Sintaxe v8: Definir como null no update remove o nó
                     updates[item.id] = null;
                 }
             });

             if (Object.keys(updates).length > 0) {
                 // Sintaxe v8: itemsRef.update(updates) para atualizações em lote/remoções
                 await itemsRef.update(updates);
                 console.log("Itens comprados limpos do Firebase.");
                 showToast("Sucesso", "Itens comprados removidos com sucesso.", "success");
                  // A UI será atualizada automaticamente pela função itemsRef.on('value', ...)
             } else {
                 showToast("Informação", "Não há itens comprados para remover.", "info");
             }

         } catch (error) {
             console.error("Erro ao limpar itens comprados do Firebase:", error);
             showToast("Erro", "Erro ao limpar itens comprados.", "danger");
         }
    }

     /**
     * Remove todos os itens do Firebase.
     */
    async function clearAllFromFirebase() {
         if (typeof itemsRef === 'undefined') {
             console.error("Referência do Firebase itemsRef não definida.");
             showToast("Erro", "Erro interno: Firebase não configurado corretamente.", "danger");
             return;
        }
         try {
             // Sintaxe v8: itemsRef.remove() remove todo o nó
             await itemsRef.remove();
             console.log("Todos os itens limpos do Firebase.");
             showToast("Sucesso", "Lista de compras limpa com sucesso.", "success");
             // A UI será atualizada automaticamente pela função itemsRef.on('value', ...)
         } catch (error) {
             console.error("Erro ao limpar todos os itens do Firebase:", error);
             showToast("Erro", "Erro ao limpar a lista inteira.", "danger");
         }
    }

    /**
     * Atualiza a categoria de todos os itens que pertencem a uma categoria específica.
     * @param {string} oldCategory - Nome da categoria antiga.
     * @param {string} newCategory - Nome da nova categoria.
     */
    async function updateItemsCategory(oldCategory, newCategory) {
        if (typeof itemsRef === 'undefined') {
            console.error("Referência do Firebase itemsRef não definida.");
            showToast("Erro", "Erro interno: Firebase não configurado corretamente.", "danger");
            return;
        }
        try {
            // Filtra os itens que pertencem à categoria antiga
            const itemsToUpdate = items.filter(item => item.Categoria === oldCategory);
            
            if (itemsToUpdate.length === 0) {
                console.log("Nenhum item encontrado na categoria:", oldCategory);
                return;
            }
            
            // Cria um objeto de atualizações em lote
            const updates = {};
            itemsToUpdate.forEach(item => {
                updates[`${item.id}/Categoria`] = newCategory;
            });
            
            // Atualiza todos os itens de uma vez
            await itemsRef.update(updates);
            console.log(`Categoria atualizada de "${oldCategory}" para "${newCategory}" em ${itemsToUpdate.length} itens.`);
            // A UI será atualizada automaticamente pela função itemsRef.on('value', ...)
        } catch (error) {
            console.error("Erro ao atualizar categoria dos itens:", error);
            showToast("Erro", "Erro ao atualizar itens da categoria.", "danger");
            throw error; // Propaga o erro para ser tratado pelo chamador
        }
    }

    /**
     * Remove todos os itens de uma categoria específica.
     * @param {string} categoryName - Nome da categoria a ser removida.
     */
    async function removeItemsByCategory(categoryName) {
        if (typeof itemsRef === 'undefined') {
            console.error("Referência do Firebase itemsRef não definida.");
            showToast("Erro", "Erro interno: Firebase não configurado corretamente.", "danger");
            return;
        }
        try {
            // Filtra os itens que pertencem à categoria
            const itemsToRemove = items.filter(item => item.Categoria === categoryName);
            
            if (itemsToRemove.length === 0) {
                console.log("Nenhum item encontrado na categoria:", categoryName);
                return;
            }
            
            // Cria um objeto de atualizações em lote para remover os itens
            const updates = {};
            itemsToRemove.forEach(item => {
                updates[item.id] = null; // Definir como null remove o nó
            });
            
            // Remove todos os itens de uma vez
            await itemsRef.update(updates);
            console.log(`Removidos ${itemsToRemove.length} itens da categoria "${categoryName}".`);
            // A UI será atualizada automaticamente pela função itemsRef.on('value', ...)
        } catch (error) {
            console.error("Erro ao remover itens da categoria:", error);
            showToast("Erro", "Erro ao remover itens da categoria.", "danger");
            throw error; // Propaga o erro para ser tratado pelo chamador
        }
    }

    /**
     * Move todos os itens de uma categoria para outra.
     * @param {string} fromCategory - Nome da categoria de origem.
     * @param {string} toCategory - Nome da categoria de destino.
     */
    async function moveItemsToCategory(fromCategory, toCategory) {
        if (typeof itemsRef === 'undefined') {
            console.error("Referência do Firebase itemsRef não definida.");
            showToast("Erro", "Erro interno: Firebase não configurado corretamente.", "danger");
            return;
        }
        try {
            // Filtra os itens que pertencem à categoria de origem
            const itemsToMove = items.filter(item => item.Categoria === fromCategory);
            
            if (itemsToMove.length === 0) {
                console.log("Nenhum item encontrado na categoria:", fromCategory);
                return;
            }
            
            // Cria um objeto de atualizações em lote
            const updates = {};
            itemsToMove.forEach(item => {
                updates[`${item.id}/Categoria`] = toCategory;
            });
            
            // Atualiza todos os itens de uma vez
            await itemsRef.update(updates);
            console.log(`Movidos ${itemsToMove.length} itens da categoria "${fromCategory}" para "${toCategory}".`);
            // A UI será atualizada automaticamente pela função itemsRef.on('value', ...)
        } catch (error) {
            console.error("Erro ao mover itens para outra categoria:", error);
            showToast("Erro", "Erro ao mover itens para outra categoria.", "danger");
            throw error; // Propaga o erro para ser tratado pelo chamador
        }
    }

    // --- Funções de Gerenciamento de Categorias ---

    /**
     * Adiciona uma nova categoria à lista local.
     * @param {string} name - Nome da categoria.
     * @param {string} icon - Ícone (emoji) da categoria.
     * @returns {boolean} - true se adicionado com sucesso, false se já existir.
     */
    function addCategory(name, icon = '📦') {
        // Verifica se a categoria já existe
        if (categories.some(cat => cat.name === name)) {
            return false;
        }
        
        // Adiciona a nova categoria
        categories.push({ name, icon });
        
        // Atualiza a UI
        renderCategorySelect();
        renderCategoryManagement();
        
        return true;
    }

    /**
     * Edita uma categoria existente na lista local e atualiza os itens relacionados.
     * @param {string} oldName - Nome atual da categoria.
     * @param {string} newName - Novo nome da categoria.
     * @param {string} newIcon - Novo ícone da categoria.
     */
    async function editCategory(oldName, newName, newIcon) {
        // Se o nome não mudou, apenas atualiza o ícone
        if (oldName === newName) {
            const category = categories.find(cat => cat.name === oldName);
            if (category) {
                category.icon = newIcon;
                renderCategorySelect();
                renderCategoryManagement();
                renderList();
                return;
            }
        }
        
        // Verifica se o novo nome já existe (exceto se for o mesmo)
        if (oldName !== newName && categories.some(cat => cat.name === newName)) {
            showToast("Erro", `A categoria "${newName}" já existe.`, "warning");
            return;
        }
        
        try {
            // Primeiro atualiza os itens no Firebase
            await updateItemsCategory(oldName, newName);
            
            // Depois atualiza a categoria localmente
            const category = categories.find(cat => cat.name === oldName);
            if (category) {
                category.name = newName;
                category.icon = newIcon;
            }
            
            // Atualiza a UI
            renderCategorySelect();
            renderCategoryManagement();
            showToast("Sucesso", `Categoria "${oldName}" editada com sucesso.`, "success");
        } catch (error) {
            console.error("Erro ao editar categoria:", error);
            showToast("Erro", "Erro ao editar categoria.", "danger");
        }
    }

    /**
     * Remove uma categoria da lista local e todos os itens relacionados.
     * @param {string} name - Nome da categoria a ser removida.
     * @param {string} option - Opção de exclusão: 'remove' para excluir itens, 'move' para mover para outra categoria.
     * @param {string} targetCategory - Nome da categoria de destino (se option for 'move').
     */
    async function deleteCategory(name, option = 'remove', targetCategory = null) {
        try {
            if (option === 'move' && targetCategory) {
                // Move os itens para outra categoria
                await moveItemsToCategory(name, targetCategory);
            } else {
                // Remove os itens da categoria
                await removeItemsByCategory(name);
            }
            
            // Depois remove a categoria localmente
            categories = categories.filter(cat => cat.name !== name);
            
            // Atualiza a UI
            renderCategorySelect();
            renderCategoryManagement();
            showToast("Sucesso", `Categoria "${name}" removida com sucesso.`, "success");
        } catch (error) {
            console.error("Erro ao excluir categoria:", error);
            showToast("Erro", "Erro ao excluir categoria.", "danger");
        }
    }

    /**
     * Reordena as categorias.
     * @param {Array} newOrder - Nova ordem das categorias.
     */
    function reorderCategories(newOrder) {
        // Cria um novo array de categorias na ordem especificada
        const reorderedCategories = [];
        newOrder.forEach(name => {
            const category = categories.find(cat => cat.name === name);
            if (category) {
                reorderedCategories.push(category);
            }
        });
        
        // Atualiza o array de categorias
        categories = reorderedCategories;
        
        // Atualiza a UI
        renderCategorySelect();
        renderList();
    }

    // --- Funções de Filtragem e Busca ---

    /**
     * Filtra os itens com base no filtro atual e termo de busca.
     * @returns {Array} - Itens filtrados.
     */
    function getFilteredItems() {
        // Primeiro filtra por status (todos, pendentes, comprados)
        let filtered = [...items];
        
        if (currentFilter === 'pending') {
            filtered = filtered.filter(item => !item.Comprado);
        } else if (currentFilter === 'bought') {
            filtered = filtered.filter(item => item.Comprado);
        }
        
        // Depois filtra por termo de busca
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(item => 
                item.Nome.toLowerCase().includes(term) || 
                item.Categoria.toLowerCase().includes(term)
            );
        }
        
        return filtered;
    }

    /**
     * Atualiza o filtro atual.
     * @param {string} filter - Novo filtro ('all', 'pending', 'bought').
     */
    function updateFilter(filter) {
        currentFilter = filter;
        
        // Atualiza a UI dos botões de filtro
        filterButtons.forEach(btn => {
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Renderiza a lista com o novo filtro
        renderList();
    }

    /**
     * Atualiza o termo de busca.
     * @param {string} term - Novo termo de busca.
     */
    function updateSearch(term) {
        searchTerm = term;
        
        // Sincroniza os campos de busca
        searchInput.value = term;
        searchInputMobile.value = term;
        
        // Renderiza a lista com o novo termo
        renderList();
    }

    // --- Funções de Renderização da UI ---

    function renderCategorySelect() {
        categorySelect.innerHTML = '<option value="" disabled selected>Selecione a categoria</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = `${category.icon} ${category.name}`;
            categorySelect.appendChild(option);
        });
        
        // Também atualiza o select de categorias para mover itens
        renderMoveToSelect();
    }
    
    /**
     * Renderiza o select de categorias para mover itens.
     * @param {string} excludeCategory - Nome da categoria a ser excluída da lista.
     */
    function renderMoveToSelect(excludeCategory = '') {
        moveToSelect.innerHTML = '';
        categories
            .filter(category => category.name !== excludeCategory)
            .forEach(category => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = `${category.icon} ${category.name}`;
                moveToSelect.appendChild(option);
            });
    }

    function renderCategoryManagement() {
        categoryManagementList.innerHTML = '';
        
        if (categories.length === 0) {
            categoryManagementList.innerHTML = '<p class="text-muted">Nenhuma categoria cadastrada.</p>';
            return;
        }
        
        categories.forEach(category => {
            // Conta quantos itens existem nesta categoria
            const itemCount = items.filter(item => item.Categoria === category.name).length;
            
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.dataset.name = category.name;
            
            const dragHandle = document.createElement('span');
            dragHandle.className = 'drag-handle';
            dragHandle.innerHTML = '<i class="bi bi-grip-vertical"></i>';
            
            const categoryInfo = document.createElement('div');
            categoryInfo.className = 'category-info';
            
            const categoryIcon = document.createElement('span');
            categoryIcon.className = 'category-icon';
            categoryIcon.textContent = category.icon;
            
            const categoryName = document.createElement('span');
            categoryName.className = 'category-name';
            categoryName.textContent = category.name;
            
            const categoryCount = document.createElement('span');
            categoryCount.className = 'category-count';
            categoryCount.textContent = itemCount;
            
            categoryInfo.appendChild(categoryIcon);
            categoryInfo.appendChild(categoryName);
            if (itemCount > 0) {
                categoryInfo.appendChild(categoryCount);
            }
            
            const categoryActions = document.createElement('div');
            categoryActions.className = 'category-item-actions';
            
            const editButton = document.createElement('button');
            editButton.className = 'btn-category-edit';
            editButton.innerHTML = '<i class="bi bi-pencil"></i>';
            editButton.title = 'Editar categoria';
            editButton.setAttribute('aria-label', `Editar categoria ${category.name}`);
            editButton.addEventListener('click', () => {
                // Preenche o modal com os dados da categoria
                editCategoryOldName.value = category.name;
                editCategoryName.value = category.name;
                editCategoryIcon.value = category.icon;
                
                // Abre o modal
                editCategoryModalInstance.show();
            });
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn-category-delete';
            deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
            deleteButton.title = 'Excluir categoria';
            deleteButton.setAttribute('aria-label', `Excluir categoria ${category.name}`);
            deleteButton.addEventListener('click', () => {
                // Preenche o modal com o nome da categoria
                deleteCategoryName.textContent = category.name;
                
                // Atualiza o select de categorias para mover itens
                renderMoveToSelect(category.name);
                
                // Abre o modal
                deleteCategoryModalInstance.show();
            });
            
            categoryActions.appendChild(editButton);
            categoryActions.appendChild(deleteButton);
            
            categoryItem.appendChild(dragHandle);
            categoryItem.appendChild(categoryInfo);
            categoryItem.appendChild(categoryActions);
            
            categoryManagementList.appendChild(categoryItem);
        });
        
        // Inicializa o Sortable para arrastar e soltar
        if (sortableInstance) {
            sortableInstance.destroy();
        }
        
        sortableInstance = new Sortable(categoryManagementList, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'dragging',
            onEnd: function(evt) {
                // Obtém a nova ordem das categorias
                const newOrder = Array.from(categoryManagementList.children)
                    .map(item => item.dataset.name);
                
                // Reordena as categorias
                reorderCategories(newOrder);
            }
        });
    }

    function renderEmojiPicker() {
        emojiPicker.innerHTML = '';
        emojis.forEach(emoji => {
            const span = document.createElement('span');
            span.textContent = emoji;
            span.setAttribute('role', 'button');
            span.setAttribute('aria-label', `Emoji ${emoji}`);
            span.setAttribute('tabindex', '0');
            span.addEventListener('click', () => {
                newCategoryIconInput.value = emoji;
                emojiPicker.classList.add('d-none');
            });
            span.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    newCategoryIconInput.value = emoji;
                    emojiPicker.classList.add('d-none');
                }
            });
            emojiPicker.appendChild(span);
        });
    }

    function renderEditEmojiPicker() {
        editEmojiPicker.innerHTML = '';
        emojis.forEach(emoji => {
            const span = document.createElement('span');
            span.textContent = emoji;
            span.setAttribute('role', 'button');
            span.setAttribute('aria-label', `Emoji ${emoji}`);
            span.setAttribute('tabindex', '0');
            span.addEventListener('click', () => {
                editCategoryIcon.value = emoji;
                editEmojiPicker.classList.add('d-none');
            });
            span.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    editCategoryIcon.value = emoji;
                    editEmojiPicker.classList.add('d-none');
                }
            });
            editEmojiPicker.appendChild(span);
        });
    }

    function renderList() {
        shoppingList.innerHTML = '';
        
        // Obtém os itens filtrados
        const filteredItems = getFilteredItems();
        
        if (filteredItems.length === 0) {
            // Mensagem quando não há itens
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'text-center p-4 text-muted';
            
            if (searchTerm) {
                emptyMessage.innerHTML = `<i class="bi bi-search mb-3" style="font-size: 2rem;"></i>
                                         <p>Nenhum item encontrado para "${searchTerm}"</p>`;
            } else if (currentFilter === 'pending') {
                emptyMessage.innerHTML = `<i class="bi bi-cart mb-3" style="font-size: 2rem;"></i>
                                         <p>Não há itens pendentes na sua lista</p>`;
            } else if (currentFilter === 'bought') {
                emptyMessage.innerHTML = `<i class="bi bi-cart-check mb-3" style="font-size: 2rem;"></i>
                                         <p>Não há itens comprados na sua lista</p>`;
            } else {
                emptyMessage.innerHTML = `<i class="bi bi-cart mb-3" style="font-size: 2rem;"></i>
                                         <p>Sua lista de compras está vazia</p>
                                         <button class="btn btn-primary" data-bs-toggle="offcanvas" data-bs-target="#offcanvasMenu">
                                             <i class="bi bi-plus-circle me-2"></i>Adicionar Item
                                         </button>`;
            }
            
            shoppingList.appendChild(emptyMessage);
            return;
        }
        
        const grouped = {};

        // Agrupar itens por categoria
        filteredItems.forEach(item => {
            // Usa a propriedade 'Categoria' do item carregado do Firebase
            if (!grouped[item.Categoria]) {
                grouped[item.Categoria] = [];
            }
            grouped[item.Categoria].push(item);
        });

        // Ordenar categorias conforme a ordem definida pelo usuário
        const sortedCategories = [];
        
        // Primeiro adiciona as categorias na ordem definida pelo usuário
        categories.forEach(category => {
            if (grouped[category.name]) {
                sortedCategories.push(category.name);
            }
        });
        
        // Depois adiciona categorias que possam existir nos itens mas não na lista de categorias
        Object.keys(grouped).forEach(categoryName => {
            if (!sortedCategories.includes(categoryName)) {
                sortedCategories.push(categoryName);
            }
        });

        sortedCategories.forEach(categoryName => {
            // Encontra o ícone localmente para a categoria
            const category = categories.find(c => c.name === categoryName);
            const icon = category ? category.icon : '📦'; // Ícone padrão se não encontrar a categoria localmente
            
            // Conta quantos itens existem nesta categoria
            const itemCount = grouped[categoryName].length;

            // Cabeçalho da Categoria
            const header = document.createElement('li');
            header.className = 'list-group-item active d-flex align-items-center slide-in';
            header.style.justifyContent = 'space-between';

            const headerLeft = document.createElement('div');
            headerLeft.className = 'd-flex align-items-center';

            const iconSpan = document.createElement('span');
            iconSpan.textContent = icon;
            iconSpan.style.fontSize = '1.5rem';
            iconSpan.style.marginRight = '10px';

            const textSpan = document.createElement('span');
            textSpan.textContent = categoryName;
            
            const countSpan = document.createElement('span');
            countSpan.className = 'ms-2 badge bg-light text-dark';
            countSpan.textContent = itemCount;

            headerLeft.appendChild(iconSpan);
            headerLeft.appendChild(textSpan);
            headerLeft.appendChild(countSpan);
            
            // Removidos botões de editar/excluir da tela principal conforme solicitado
            header.appendChild(headerLeft);
            shoppingList.appendChild(header);

            // Itens da Categoria
            grouped[categoryName].forEach((item) => {
                const li = document.createElement('li');
                // Adiciona a classe 'bought' se o item estiver marcado como comprado no Firebase
                li.className = `list-group-item d-flex justify-content-between align-items-center fade-in ${item.Comprado ? 'bought' : ''}`;
                li.setAttribute('data-id', item.id);
                li.setAttribute('aria-checked', item.Comprado ? 'true' : 'false');
                li.setAttribute('role', 'checkbox');
                li.setAttribute('tabindex', '0');

                // Conteúdo do item (checkbox, nome, quantidade)
                const itemContentDiv = document.createElement('div');
                itemContentDiv.className = 'list-item-content';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = item.Comprado; // Usa o status 'Comprado' do Firebase
                checkbox.className = 'form-check-input';
                checkbox.setAttribute('aria-label', `Marcar ${item.Nome} como ${item.Comprado ? 'não comprado' : 'comprado'}`);
                // Evento para marcar/desmarcar
                checkbox.addEventListener('change', async () => {
                    const newBoughtStatus = checkbox.checked;
                     const updatedData = {
                        Comprado: newBoughtStatus // Atualiza apenas o status de comprado no Firebase
                    };
                    // Atualiza o estado local temporariamente para feedback visual rápido
                     item.Comprado = newBoughtStatus;
                     li.classList.toggle('bought', newBoughtStatus); // Atualiza a classe visual
                     li.setAttribute('aria-checked', newBoughtStatus ? 'true' : 'false');
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

                // Botão de remover (alterado para ícone de lixeira)
                const removeBtn = document.createElement('button');
                removeBtn.className = 'btn-item-remove';
                removeBtn.innerHTML = '<i class="bi bi-trash"></i>';
                removeBtn.title = 'Remover item';
                removeBtn.setAttribute('aria-label', `Remover ${item.Nome} da lista`);
                removeBtn.addEventListener('click', async (e) => {
                    e.stopPropagation(); // Impede que o clique no botão acione o evento do LI
                    await removeItemFromFirebase(item.id); // Remove o item do Firebase
                    // A lista será renderizada automaticamente pela função itemsRef.on('value', ...)
                });
                
                // Ações de swipe (para dispositivos touch)
                const swipeActions = document.createElement('div');
                swipeActions.className = 'swipe-actions';
                
                const checkAction = document.createElement('div');
                checkAction.className = 'swipe-action swipe-action-check';
                checkAction.innerHTML = '<i class="bi bi-check-lg"></i>';
                
                const deleteAction = document.createElement('div');
                deleteAction.className = 'swipe-action swipe-action-delete';
                deleteAction.innerHTML = '<i class="bi bi-trash"></i>';
                
                swipeActions.appendChild(checkAction);
                swipeActions.appendChild(deleteAction);

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
                     li.setAttribute('aria-checked', newBoughtStatus ? 'true' : 'false');
                    // Envia a atualização para o Firebase
                    await updateItemInFirebase(item.id, updatedData); // Use await e o ID do item do Firebase
                    // A lista será atualizada automaticamente na UI pela função itemsRef.on('value', ...)
                });
                
                // Adiciona suporte a navegação por teclado
                li.addEventListener('keydown', async (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const newBoughtStatus = !checkbox.checked;
                        const updatedData = {
                            Comprado: newBoughtStatus
                        };
                        item.Comprado = newBoughtStatus;
                        checkbox.checked = newBoughtStatus;
                        li.classList.toggle('bought', newBoughtStatus);
                        li.setAttribute('aria-checked', newBoughtStatus ? 'true' : 'false');
                        await updateItemInFirebase(item.id, updatedData);
                    } else if (e.key === 'Delete') {
                        e.preventDefault();
                        await removeItemFromFirebase(item.id);
                    }
                });

                li.appendChild(itemContentDiv);
                li.appendChild(removeBtn);
                li.appendChild(swipeActions);
                shoppingList.appendChild(li);
                
                // Inicializa o suporte a gestos de swipe
                initSwipeGestures(li);
            });
        });
    }
    
    /**
     * Inicializa os gestos de swipe para um item da lista.
     * @param {HTMLElement} element - Elemento da lista.
     */
    function initSwipeGestures(element) {
        let touchStartX = 0;
        let touchEndX = 0;
        let isSwiping = false;
        
        element.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        element.addEventListener('touchmove', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diffX = touchStartX - touchEndX;
            
            // Se o deslize for significativo para a esquerda
            if (diffX > 50 && !isSwiping) {
                isSwiping = true;
                element.classList.add('swiped');
            }
            
            // Se o deslize for significativo para a direita (voltar)
            if (diffX < -50 && isSwiping) {
                isSwiping = false;
                element.classList.remove('swiped');
            }
        }, { passive: true });
        
        element.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diffX = touchStartX - touchEndX;
            
            // Se o deslize for significativo para a esquerda
            if (diffX > 100) {
                // Mostra as ações de swipe
                element.classList.add('swiped');
                
                // Adiciona eventos de clique às ações
                const itemId = element.dataset.id;
                const item = items.find(i => i.id === itemId);
                
                if (item) {
                    const checkAction = element.querySelector('.swipe-action-check');
                    const deleteAction = element.querySelector('.swipe-action-delete');
                    
                    checkAction.addEventListener('click', async () => {
                        const newBoughtStatus = !item.Comprado;
                        await updateItemInFirebase(itemId, { Comprado: newBoughtStatus });
                        element.classList.remove('swiped');
                    });
                    
                    deleteAction.addEventListener('click', async () => {
                        await removeItemFromFirebase(itemId);
                        element.classList.remove('swiped');
                    });
                }
            } else if (diffX < -50) {
                // Esconde as ações de swipe se deslizar para a direita
                element.classList.remove('swiped');
            }
            
            isSwiping = false;
        }, { passive: true });
    }

    // --- Função para criar notificações toast ---
    
    /**
     * Exibe uma notificação toast.
     * @param {string} title - Título da notificação.
     * @param {string} message - Mensagem da notificação.
     * @param {string} type - Tipo da notificação (success, info, warning, danger).
     */
    function showToast(title, message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        
        const toast = document.createElement('div');
        toast.className = `toast show`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        
        const toastHeader = document.createElement('div');
        toastHeader.className = `toast-header text-white bg-${type}`;
        
        const toastTitle = document.createElement('strong');
        toastTitle.className = 'me-auto';
        toastTitle.textContent = title;
        
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'btn-close btn-close-white';
        closeButton.setAttribute('data-bs-dismiss', 'toast');
        closeButton.setAttribute('aria-label', 'Fechar');
        closeButton.addEventListener('click', () => {
            toast.remove();
        });
        
        toastHeader.appendChild(toastTitle);
        toastHeader.appendChild(closeButton);
        
        const toastBody = document.createElement('div');
        toastBody.className = 'toast-body';
        toastBody.textContent = message;
        
        toast.appendChild(toastHeader);
        toast.appendChild(toastBody);
        
        toastContainer.appendChild(toast);
        
        // Remove o toast após 5 segundos
        setTimeout(() => {
            toast.classList.add('fade');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 5000);
    }

    // --- Event Listeners ---

    // Adicionar Item
    document.getElementById('addItemForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const itemName = itemInput.value.trim();
        const itemQuantity = parseInt(itemQuantityInput.value) || 1;
        const categoryName = categorySelect.value;

        if (itemName && categoryName) {
            // Cria o objeto de dados do item para o Firebase
            const itemData = {
                Nome: itemName,
                Quantidade: itemQuantity,
                Categoria: categoryName,
                Comprado: false
            };

            await addItemToFirebase(itemData);
            
            // Limpa os campos do formulário
            itemInput.value = '';
            itemQuantityInput.value = '1';
            categorySelect.selectedIndex = 0;
            
            // Fecha o offcanvas em dispositivos móveis
            if (window.innerWidth < 768) {
                const offcanvasInstance = bootstrap.Offcanvas.getInstance(document.getElementById('offcanvasMenu'));
                if (offcanvasInstance) {
                    offcanvasInstance.hide();
                }
            }
        } else {
            showToast("Atenção", "Por favor, preencha todos os campos.", "warning");
        }
    });

    // Adicionar Categoria
    document.getElementById('addCategoryForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const newCategory = newCategoryInput.value.trim();
        const newIcon = newCategoryIconInput.value.trim() || '📦'; // Usa ícone padrão se não for fornecido

        if (newCategory && !categories.some(c => c.name === newCategory)) {
            // Adiciona a categoria localmente
            categories.push({ name: newCategory, icon: newIcon });
            
            // Limpa os campos do formulário
            newCategoryInput.value = '';
            newCategoryIconInput.value = '';
            
            // Se as categorias fossem no Firebase, você chamaria uma função para adicionar/atualizar o nó 'categories' aqui
            renderCategorySelect(); // Atualiza o dropdown local
            renderCategoryManagement(); // Atualiza a lista de gerenciamento de categorias
            showToast("Sucesso", `Categoria "${newCategory}" adicionada com sucesso!`, "success");
        } else if (newCategory) {
            showToast("Atenção", `A categoria "${newCategory}" já existe.`, "warning");
        } else {
            showToast("Atenção", "Por favor, insira o nome da nova categoria.", "warning");
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
    
    // Toggle Edit Emoji Picker
    editEmojiPickerButton.addEventListener('click', () => {
        if (editEmojiPicker.classList.contains('d-none')) {
            renderEditEmojiPicker(); // Renderiza o picker antes de mostrar
            editEmojiPicker.classList.remove('d-none');
        } else {
            editEmojiPicker.classList.add('d-none');
        }
    });

    // Salvar alterações da categoria
    saveCategoryChanges.addEventListener('click', async () => {
        const oldName = editCategoryOldName.value;
        const newName = editCategoryName.value.trim();
        const newIcon = editCategoryIcon.value.trim() || '📦';
        
        if (!newName) {
            showToast("Atenção", "O nome da categoria não pode estar vazio.", "warning");
            return;
        }
        
        // Fecha o modal
        editCategoryModalInstance.hide();
        
        // Edita a categoria
        await editCategory(oldName, newName, newIcon);
    });
    
    // Toggle opção de mover itens
    deleteOptionMove.addEventListener('change', () => {
        moveToCategory.classList.remove('d-none');
    });
    
    deleteOptionRemove.addEventListener('change', () => {
        moveToCategory.classList.add('d-none');
    });
    
    // Confirmar exclusão de categoria
    confirmDeleteCategory.addEventListener('click', async () => {
        const categoryName = deleteCategoryName.textContent;
        const deleteOption = document.querySelector('input[name="deleteOption"]:checked').value;
        let targetCategory = null;
        
        if (deleteOption === 'move') {
            targetCategory = moveToSelect.value;
            if (!targetCategory) {
                showToast("Atenção", "Por favor, selecione uma categoria de destino.", "warning");
                return;
            }
        }
        
        // Fecha o modal
        deleteCategoryModalInstance.hide();
        
        // Exclui a categoria
        await deleteCategory(categoryName, deleteOption, targetCategory);
    });

    // Botões de limpar removidos conforme solicitado pelo usuário
    
    // Filtros
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            updateFilter(button.dataset.filter);
        });
    });
    
    // Busca
    searchInput.addEventListener('input', (e) => {
        updateSearch(e.target.value.trim());
    });
    
    searchInputMobile.addEventListener('input', (e) => {
        updateSearch(e.target.value.trim());
    });
    
    // Atalhos de teclado removidos conforme solicitado pelo usuário

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
    renderCategoryManagement(); // Renderiza a lista de gerenciamento de categorias
    // renderList() é chamado pela função de sincronização do Firebase quando os dados são carregados inicialmente e em cada mudança.

});

