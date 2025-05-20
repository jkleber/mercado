// Este script usa o Firebase Realtime Database (SDK v8) para armazenar e sincronizar a lista de compras.
// Certifique-se de que o Firebase SDK (firebase-app.js, firebase-database.js v8.x.x)
// e suas configurações (firebaseConfig) estejam incluídos no seu arquivo index.html
// em tags <script> ANTES deste script.
// O index.html deve inicializar o app Firebase e criar as referências 'database', 'itemsRef', 'categoriesRef', e 'categoryOrderRef'.

document.addEventListener('DOMContentLoaded', function () {
    // --- Referências aos Elementos HTML ---
    // (sem alterações aqui)
    const fabAddItemButton = document.getElementById('fabAddItem');
    const addItemButton = document.getElementById('addItemButton');
    const addCategoryButton = document.getElementById('addCategoryButton');
    const itemInput = document.getElementById('itemInput');
    const itemQuantityInput = document.getElementById('itemQuantity');
    const categorySelect = document.getElementById('categorySelect');
    const newCategoryInput = document.getElementById('newCategoryInput');
    const newCategoryIconInput = document.getElementById('newCategoryIconInput');
    const emojiPickerButton = document.getElementById('emojiPickerButton');
    const emojiPicker = document.getElementById('emojiPicker');
    const shoppingList = document.getElementById('shoppingList');
    const categoryManagementList = document.getElementById('categoryManagementList');
    const searchInput = document.getElementById('searchInput');
    const searchInputMobile = document.getElementById('searchInputMobile');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    const editCategoryModal = document.getElementById('editCategoryModal');
    const editCategoryForm = document.getElementById('editCategoryForm');
    const editCategoryId = document.getElementById('editCategoryId'); 
    const editCategoryOldName = document.getElementById('editCategoryOldName'); 
    const editCategoryName = document.getElementById('editCategoryName');
    const editCategoryIcon = document.getElementById('editCategoryIcon');
    const editEmojiPickerButton = document.getElementById('editEmojiPickerButton');
    const editEmojiPicker = document.getElementById('editEmojiPicker');
    const saveCategoryChanges = document.getElementById('saveCategoryChanges');
    
    const deleteCategoryModal = document.getElementById('deleteCategoryModal');
    const deleteCategoryIdField = document.getElementById('deleteCategoryIdField'); 
    const deleteCategoryName = document.getElementById('deleteCategoryName');
    const deleteOptionRemove = document.getElementById('deleteOptionRemove');
    const deleteOptionMove = document.getElementById('deleteOptionMove');
    const moveToCategory = document.getElementById('moveToCategory');
    const moveToSelect = document.getElementById('moveToSelect');
    const confirmDeleteCategory = document.getElementById('confirmDeleteCategory');
    
    const editCategoryModalInstance = new bootstrap.Modal(editCategoryModal);
    const deleteCategoryModalInstance = new bootstrap.Modal(deleteCategoryModal);

    // --- Estado da Aplicação ---
    let categories = []; // Array de categorias ORDENADAS para a UI
    let items = []; 
    let currentFilter = 'all';
    let searchTerm = '';
    let sortableInstance = null;

    // NOVAS variáveis para gerenciar dados brutos e ordem
    let localRawCategories = []; // Dados das categorias como vêm do Firebase
    let localCategoryOrderFromFirebase = []; // Array de IDs na ordem salva

    const emojis = ['🍎', '🥦', '🥛', '🍖', '🍹', '🍞', '🍗', '🍇', '🍉', '🍌', '🍒', '🥕', '🥩', '🍤', '🍰', '🍪', '🍕', '🌽', '🍅', '🥥', '🛒', '🛍️', '📋', '📍', '🧀', '🥚', '🥓', '🥖', '🥐', '🧈', '🧂', '🥫', '🥔', '🍠', '🍯', '🥜', '🫘', '🍝', '🥞', '🧊', '🧃', '🧴', '🧻', '🧼', '🧹', '🧺', '🪣', '🧷', '🪒', '🪥', '🧸', '📱', '💻', '🔋', '💡', '🧾'];

    // --- Inicialização e Conexão com Firebase ---
    // Adicionada verificação para categoryOrderRef
    if (typeof firebase === 'undefined' || typeof database === 'undefined' || typeof itemsRef === 'undefined' || typeof categoriesRef === 'undefined' || typeof categoryOrderRef === 'undefined') {
        console.error("Firebase SDK ou referências de banco de dados não carregadas corretamente no index.html.");
        showToast("Erro", "Erro na configuração do Firebase. Verifique o arquivo index.html.", "danger");
        return;
    }

    // --- Função Central para Processar e Renderizar a UI ---
    function processAndRenderUI() {
        // Ordena as categorias
        let orderedCategoriesForUI = [];
        if (localRawCategories.length > 0) {
            if (localCategoryOrderFromFirebase.length > 0) {
                localCategoryOrderFromFirebase.forEach(catId => {
                    const category = localRawCategories.find(c => c.id === catId);
                    if (category) {
                        orderedCategoriesForUI.push(category);
                    }
                });
                // Adiciona categorias que estão em localRawCategories mas não na ordem salva (novas categorias)
                localRawCategories.forEach(cat => {
                    if (!orderedCategoriesForUI.find(oc => oc.id === cat.id)) {
                        orderedCategoriesForUI.push(cat); // Adiciona no final
                    }
                });
            } else {
                // Se não há ordem definida, usa a ordem de chegada de localRawCategories
                orderedCategoriesForUI = [...localRawCategories];
            }
        }
        
        categories = orderedCategoriesForUI; // Atualiza o array 'categories' global que as funções de render usam

        // Chama as funções de renderização
        renderCategorySelect();
        renderCategoryManagement(); // Esta renderiza com base no array 'categories' já ordenado
        renderList(); // Itens também dependem dos ícones e nomes das categorias ordenadas
        renderMoveToSelect(); // Atualiza o select no modal de exclusão
    }


    // --- Sincronização em Tempo Real com Firebase ---

    // Listener para a ORDEM das categorias
    categoryOrderRef.on('value', (snapshot) => {
        const orderData = snapshot.val();
        localCategoryOrderFromFirebase = Array.isArray(orderData) ? orderData : [];
        console.log('Ordem das categorias do Firebase recebida:', localCategoryOrderFromFirebase);
        processAndRenderUI(); // Processa e renderiza com a nova ordem
    }, (error) => {
        console.error("Erro ao sincronizar ordem das categorias com Firebase:", error);
        showToast("Erro", "Erro ao carregar ordem das categorias.", "danger");
    });

    // Listener para os DADOS das categorias
    categoriesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        localRawCategories = []; // Limpa para recarregar
        if (data) {
            Object.keys(data).forEach(key => {
                localRawCategories.push({
                    id: key,
                    ...data[key] // name, icon
                });
            });
        }
        console.log('Categorias do Firebase recebidas (dados brutos):', localRawCategories);
        processAndRenderUI(); // Processa e renderiza com os novos dados de categoria
    }, (error) => {
        console.error("Erro ao sincronizar categorias com Firebase:", error);
        showToast("Erro", "Erro ao carregar categorias.", "danger");
    });

    // Listener para os ITENS (sem alteração na lógica de ordenação de categorias aqui)
    itemsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        items = [];
        if (data) {
            Object.keys(data).forEach(key => {
                items.push({
                    id: key,
                    ...data[key]
                });
            });
        }
        console.log('Itens do Firebase recebidos:', items);
        // A lista de itens será renderizada por processAndRenderUI se as categorias mudarem,
        // ou podemos chamar renderList() diretamente se apenas os itens mudarem e a ordem das categorias não.
        // Para simplificar, processAndRenderUI já chama renderList.
        // Se houver muitas atualizações de itens, pode ser otimizado para chamar renderList() aqui.
        // No entanto, renderList também é chamado por processAndRenderUI, que é acionado por mudanças de categoria/ordem.
        // Se apenas um item mudar, e não uma categoria, precisamos garantir que a lista de itens seja atualizada.
        renderList(); // Chamada direta para garantir atualização da lista de itens
        renderCategoryManagement(); // Atualiza contadores de itens por categoria
    }, (error) => {
        console.error("Erro ao sincronizar itens com Firebase:", error);
        showToast("Erro", "Erro ao carregar lista de compras.", "danger");
    });


    // --- Funções de Interação com Firebase (Itens) ---
    // (sem alterações aqui)
    async function addItemToFirebase(itemData) {
        try {
            const newItemRef = await itemsRef.push(itemData);
            console.log("Item adicionado ao Firebase com ID:", newItemRef.key);
            showToast("Sucesso", "Item adicionado à lista.", "success");
        } catch (error) {
            console.error("Erro ao adicionar item ao Firebase:", error);
            showToast("Erro", "Erro ao adicionar item.", "danger");
        }
    }

    async function updateItemInFirebase(itemId, updatedData) {
         try {
             await itemsRef.child(itemId).update(updatedData);
             console.log("Item atualizado no Firebase com ID:", itemId);
         } catch (error) {
             console.error("Erro ao atualizar item no Firebase:", error);
             showToast("Erro", "Erro ao atualizar item.", "danger");
         }
    }

    async function removeItemFromFirebase(itemId) {
         try {
             await itemsRef.child(itemId).remove();
             console.log("Item removido do Firebase com ID:", itemId);
             showToast("Sucesso", "Item removido da lista.", "success");
         } catch (error) {
             console.error("Erro ao remover item do Firebase:", error);
             showToast("Erro", "Erro ao remover item.", "danger");
         }
    }
    
    async function updateItemsCategory(oldCategoryName, newCategoryName) {
        try {
            const itemsToUpdate = items.filter(item => item.Categoria === oldCategoryName);
            if (itemsToUpdate.length === 0) {
                console.log("Nenhum item encontrado na categoria:", oldCategoryName);
                return;
            }
            const updates = {};
            itemsToUpdate.forEach(item => {
                updates[`${item.id}/Categoria`] = newCategoryName;
            });
            await itemsRef.update(updates);
            console.log(`Categoria atualizada de "${oldCategoryName}" para "${newCategoryName}" em ${itemsToUpdate.length} itens.`);
        } catch (error) {
            console.error("Erro ao atualizar categoria dos itens:", error);
            showToast("Erro", "Erro ao atualizar itens da categoria.", "danger");
            throw error;
        }
    }

    async function removeItemsByCategory(categoryName) {
        try {
            const itemsToRemove = items.filter(item => item.Categoria === categoryName);
            if (itemsToRemove.length === 0) {
                console.log("Nenhum item encontrado na categoria:", categoryName);
                return;
            }
            const updates = {};
            itemsToRemove.forEach(item => {
                updates[item.id] = null;
            });
            await itemsRef.update(updates);
            console.log(`Removidos ${itemsToRemove.length} itens da categoria "${categoryName}".`);
        } catch (error) {
            console.error("Erro ao remover itens da categoria:", error);
            showToast("Erro", "Erro ao remover itens da categoria.", "danger");
            throw error;
        }
    }

    async function moveItemsToCategory(fromCategoryName, toCategoryName) {
        try {
            const itemsToMove = items.filter(item => item.Categoria === fromCategoryName);
            if (itemsToMove.length === 0) {
                console.log("Nenhum item encontrado na categoria:", fromCategoryName);
                return;
            }
            const updates = {};
            itemsToMove.forEach(item => {
                updates[`${item.id}/Categoria`] = toCategoryName;
            });
            await itemsRef.update(updates);
            console.log(`Movidos ${itemsToMove.length} itens da categoria "${fromCategoryName}" para "${toCategoryName}".`);
        } catch (error) {
            console.error("Erro ao mover itens para outra categoria:", error);
            showToast("Erro", "Erro ao mover itens.", "danger");
            throw error;
        }
    }

    // --- Funções de Gerenciamento de Categorias (Firebase) ---
    // (sem alterações na lógica interna de add, edit, delete, exceto que a UI será atualizada por processAndRenderUI)

    async function addCategoryToFirebase(name, icon = '📦') {
        if (localRawCategories.some(cat => cat.name === name)) { // Verifica em localRawCategories
            showToast("Atenção", `A categoria "${name}" já existe.`, "warning");
            return false;
        }
        try {
            await categoriesRef.push({ name, icon });
            showToast("Sucesso", `Categoria "${name}" adicionada.`, "success");
            // A UI será atualizada pelo listener de categoriesRef chamando processAndRenderUI
            return true;
        } catch (error) {
            console.error("Erro ao adicionar categoria ao Firebase:", error);
            showToast("Erro", "Erro ao adicionar categoria.", "danger");
            return false;
        }
    }

    async function editCategoryInFirebase(categoryId, oldName, newName, newIcon) {
        if (oldName !== newName && localRawCategories.some(cat => cat.id !== categoryId && cat.name === newName)) {
            showToast("Erro", `A categoria "${newName}" já existe.`, "warning");
            return;
        }
        try {
            if (oldName !== newName) {
                await updateItemsCategory(oldName, newName);
            }
            await categoriesRef.child(categoryId).update({ name: newName, icon: newIcon });
            showToast("Sucesso", `Categoria "${oldName}" editada para "${newName}".`, "success");
        } catch (error) {
            console.error("Erro ao editar categoria:", error);
            showToast("Erro", "Erro ao editar categoria.", "danger");
        }
    }

    async function deleteCategoryFromFirebase(categoryId, categoryName, option = 'remove', targetCategoryName = null) {
        try {
            if (option === 'move' && targetCategoryName) {
                await moveItemsToCategory(categoryName, targetCategoryName);
            } else {
                await removeItemsByCategory(categoryName);
            }
            
            await categoriesRef.child(categoryId).remove();

            // Remove a categoria da ordem salva, se existir
            const updatedOrder = localCategoryOrderFromFirebase.filter(id => id !== categoryId);
            if (updatedOrder.length !== localCategoryOrderFromFirebase.length) {
                await categoryOrderRef.set(updatedOrder);
            }

            showToast("Sucesso", `Categoria "${categoryName}" removida.`, "success");
        } catch (error) {
            console.error("Erro ao excluir categoria:", error);
            showToast("Erro", "Erro ao excluir categoria.", "danger");
        }
    }
    
    // NOVA função para atualizar a ordem e persistir
    async function updateCategoryOrderAndPersist(orderedCategoryIds) {
        localCategoryOrderFromFirebase = orderedCategoryIds; // Atualiza a ordem local imediatamente

        // Atualiza o array 'categories' global com a nova ordem para feedback visual
        // e re-renderiza as UIs relevantes.
        processAndRenderUI(); 

        try {
            // Salva a nova ordem no Firebase
            await categoryOrderRef.set(orderedCategoryIds);
            console.log("Ordem das categorias salva no Firebase.");
        } catch (error) {
            console.error("Erro ao salvar ordem das categorias no Firebase:", error);
            showToast("Erro", "Não foi possível salvar a nova ordem das categorias.", "danger");
            // Opcional: Recarregar a ordem do Firebase para reverter a UI ao estado salvo.
            // categoryOrderRef.once('value').then(snapshot => { ... }); // Para evitar loop com 'on'
        }
    }


    // --- Funções de Filtragem e Busca ---
    // (sem alterações aqui)
    function getFilteredItems() {
        let filtered = [...items];
        if (currentFilter === 'pending') {
            filtered = filtered.filter(item => !item.Comprado);
        } else if (currentFilter === 'bought') {
            filtered = filtered.filter(item => item.Comprado);
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(item => 
                item.Nome.toLowerCase().includes(term) || 
                (item.Categoria && item.Categoria.toLowerCase().includes(term)) // Adicionado check para item.Categoria
            );
        }
        return filtered;
    }

    function updateFilter(filter) {
        currentFilter = filter;
        filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        renderList();
    }

    function updateSearch(term) {
        searchTerm = term;
        if (searchInput.value !== term) searchInput.value = term; // Sincroniza
        if (searchInputMobile.value !== term) searchInputMobile.value = term; // Sincroniza
        renderList();
    }

    // --- Funções de Renderização da UI ---
    // Estas funções agora usam o array `categories` que é mantido ordenado por `processAndRenderUI`

    function renderCategorySelect() {
        const currentCategoryValue = categorySelect.value;
        categorySelect.innerHTML = '<option value="" disabled>Selecione a categoria</option>';
        // 'categories' já está ordenado por processAndRenderUI
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name; 
            option.textContent = `${category.icon} ${category.name}`;
            categorySelect.appendChild(option);
        });
        if (categories.some(c => c.name === currentCategoryValue)) {
            categorySelect.value = currentCategoryValue;
        } else {
             categorySelect.selectedIndex = 0; 
        }
        // renderMoveToSelect() é chamado por processAndRenderUI
    }
    
    function renderMoveToSelect(excludeCategoryName = '') {
        moveToSelect.innerHTML = '';
        // 'categories' já está ordenado
        categories
            .filter(category => category.name !== excludeCategoryName)
            .forEach(category => {
                const option = document.createElement('option');
                option.value = category.name; 
                option.textContent = `${category.icon} ${category.name}`;
                moveToSelect.appendChild(option);
            });
    }

    function renderCategoryManagement() {
        categoryManagementList.innerHTML = '';
        // 'categories' já está ordenado
        if (categories.length === 0) {
            categoryManagementList.innerHTML = '<p class="text-muted">Nenhuma categoria cadastrada.</p>';
            return;
        }
        
        categories.forEach(category => {
            const itemCount = items.filter(item => item.Categoria === category.name).length;
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.dataset.id = category.id; 
            categoryItem.dataset.name = category.name; 
            
            const dragHandle = document.createElement('span');
            dragHandle.className = 'drag-handle';
            dragHandle.innerHTML = '<i class="bi bi-grip-vertical"></i>';
            
            const categoryInfo = document.createElement('div');
            categoryInfo.className = 'category-info';
            const categoryIconEl = document.createElement('span');
            categoryIconEl.className = 'category-icon';
            categoryIconEl.textContent = category.icon;
            const categoryNameEl = document.createElement('span');
            categoryNameEl.className = 'category-name';
            categoryNameEl.textContent = category.name;
            const categoryCount = document.createElement('span');
            categoryCount.className = 'category-count';
            categoryCount.textContent = itemCount;
            
            categoryInfo.appendChild(categoryIconEl);
            categoryInfo.appendChild(categoryNameEl);
            if (itemCount > 0) categoryInfo.appendChild(categoryCount);
            
            const categoryActions = document.createElement('div');
            categoryActions.className = 'category-item-actions';
            
            const editButton = document.createElement('button');
            editButton.className = 'btn-category-edit';
            editButton.innerHTML = '<i class="bi bi-pencil"></i>';
            editButton.title = 'Editar categoria';
            editButton.setAttribute('aria-label', `Editar categoria ${category.name}`);
            editButton.addEventListener('click', () => {
                editCategoryId.value = category.id; 
                editCategoryOldName.value = category.name; 
                editCategoryName.value = category.name;   
                editCategoryIcon.value = category.icon;
                editEmojiPicker.classList.add('d-none');
                editCategoryModalInstance.show();
            });
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn-category-delete';
            deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
            deleteButton.title = 'Excluir categoria';
            deleteButton.setAttribute('aria-label', `Excluir categoria ${category.name}`);
            deleteButton.addEventListener('click', () => {
                deleteCategoryIdField.value = category.id; 
                deleteCategoryName.textContent = category.name; 
                renderMoveToSelect(category.name); // Manter esta chamada específica aqui para excluir a categoria atual do select
                moveToCategory.classList.add('d-none');
                deleteOptionRemove.checked = true;
                deleteCategoryModalInstance.show();
            });
            
            categoryActions.appendChild(editButton);
            categoryActions.appendChild(deleteButton);
            
            categoryItem.appendChild(dragHandle);
            categoryItem.appendChild(categoryInfo);
            categoryItem.appendChild(categoryActions);
            
            categoryManagementList.appendChild(categoryItem);
        });
        
        if (sortableInstance) sortableInstance.destroy();
        sortableInstance = new Sortable(categoryManagementList, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'dragging',
            // Modificado para chamar a nova função async
            onEnd: async function(evt) { 
                const orderedCategoryIds = Array.from(categoryManagementList.children)
                    .map(item => item.dataset.id); 
                await updateCategoryOrderAndPersist(orderedCategoryIds); // Chama a nova função
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
        const filteredItems = getFilteredItems();
        // 'categories' já está ordenado por processAndRenderUI
        
        if (filteredItems.length === 0) {
            // (código da mensagem de lista vazia - sem alterações)
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'text-center p-4 text-muted';
            if (searchTerm) {
                emptyMessage.innerHTML = `<i class="bi bi-search mb-3" style="font-size: 2rem;"></i><p>Nenhum item encontrado para "${searchTerm}"</p>`;
            } else if (currentFilter === 'pending') {
                emptyMessage.innerHTML = `<i class="bi bi-cart mb-3" style="font-size: 2rem;"></i><p>Não há itens pendentes</p>`;
            } else if (currentFilter === 'bought') {
                emptyMessage.innerHTML = `<i class="bi bi-cart-check mb-3" style="font-size: 2rem;"></i><p>Não há itens comprados</p>`;
            } else {
                emptyMessage.innerHTML = `<i class="bi bi-cart mb-3" style="font-size: 2rem;"></i><p>Sua lista está vazia</p><button class="btn btn-primary" data-bs-toggle="offcanvas" data-bs-target="#offcanvasMenu"><i class="bi bi-plus-circle me-2"></i>Adicionar Item</button>`;
            }
            shoppingList.appendChild(emptyMessage);
            return;
        }
        
        const grouped = {};
        filteredItems.forEach(item => {
            if (!grouped[item.Categoria]) grouped[item.Categoria] = [];
            grouped[item.Categoria].push(item);
        });

        categories.forEach(category => { // Usa o array 'categories' ordenado
            const categoryName = category.name;
            if (grouped[categoryName]) {
                // (Restante da lógica de renderList para cabeçalhos e itens - sem alterações)
                const icon = category.icon || '📦';
                const itemCount = grouped[categoryName].length;

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
                header.appendChild(headerLeft);
                shoppingList.appendChild(header);

                grouped[categoryName].forEach((item) => {
                    const li = document.createElement('li');
                    li.className = `list-group-item d-flex justify-content-between align-items-center fade-in ${item.Comprado ? 'bought' : ''}`;
                    li.setAttribute('data-id', item.id);
                    li.setAttribute('aria-checked', item.Comprado ? 'true' : 'false');
                    li.setAttribute('role', 'checkbox');
                    li.setAttribute('tabindex', '0');

                    const itemContentDiv = document.createElement('div');
                    itemContentDiv.className = 'list-item-content';
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = item.Comprado;
                    checkbox.className = 'form-check-input';
                    checkbox.setAttribute('aria-label', `Marcar ${item.Nome} como ${item.Comprado ? 'não comprado' : 'comprado'}`);
                    checkbox.addEventListener('change', async () => {
                        const newBoughtStatus = checkbox.checked;
                        item.Comprado = newBoughtStatus; 
                        li.classList.toggle('bought', newBoughtStatus);
                        li.setAttribute('aria-checked', newBoughtStatus ? 'true' : 'false');
                        await updateItemInFirebase(item.id, { Comprado: newBoughtStatus });
                    });

                    const itemNameSpan = document.createElement('span');
                    itemNameSpan.textContent = item.Nome;
                    itemNameSpan.className = 'item-name';
                    const itemQuantitySpan = document.createElement('span');
                    itemQuantitySpan.textContent = item.Quantidade > 1 ? `(${item.Quantidade})` : '';
                    itemQuantitySpan.className = 'item-quantity';

                    itemContentDiv.appendChild(checkbox);
                    itemContentDiv.appendChild(itemNameSpan);
                    if (item.Quantidade > 1) itemContentDiv.appendChild(itemQuantitySpan);

                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'btn-item-remove';
                    removeBtn.innerHTML = '<i class="bi bi-trash"></i>';
                    removeBtn.title = 'Remover item';
                    removeBtn.setAttribute('aria-label', `Remover ${item.Nome}`);
                    removeBtn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        await removeItemFromFirebase(item.id);
                    });
                    
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

                    li.addEventListener('click', async (e) => {
                        if (e.target === removeBtn || e.target === checkbox || removeBtn.contains(e.target)) return;
                        const newBoughtStatus = !checkbox.checked;
                        item.Comprado = newBoughtStatus; 
                        checkbox.checked = newBoughtStatus;
                        li.classList.toggle('bought', newBoughtStatus);
                        li.setAttribute('aria-checked', newBoughtStatus ? 'true' : 'false');
                        await updateItemInFirebase(item.id, { Comprado: newBoughtStatus });
                    });
                    li.addEventListener('keydown', async (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            const newBoughtStatus = !checkbox.checked;
                            item.Comprado = newBoughtStatus; checkbox.checked = newBoughtStatus;
                            li.classList.toggle('bought', newBoughtStatus);
                            li.setAttribute('aria-checked', newBoughtStatus ? 'true' : 'false');
                            await updateItemInFirebase(item.id, { Comprado: newBoughtStatus });
                        } else if (e.key === 'Delete') {
                            e.preventDefault();
                            await removeItemFromFirebase(item.id);
                        }
                    });

                    li.appendChild(itemContentDiv);
                    li.appendChild(removeBtn);
                    li.appendChild(swipeActions);
                    shoppingList.appendChild(li);
                    initSwipeGestures(li);
                });
            }
        });
        Object.keys(grouped).forEach(categoryName => {
            if (!categories.find(c => c.name === categoryName)) {
                console.warn(`Itens encontrados para categoria não gerenciada ou não na ordem: ${categoryName}`);
            }
        });
    }
    
    function initSwipeGestures(element) {
        // (sem alterações aqui)
        let touchStartX = 0, touchEndX = 0, isSwiping = false;
        const itemId = element.dataset.id;
        
        element.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; isSwiping = false; }, { passive: true });
        element.addEventListener('touchmove', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diffX = touchStartX - touchEndX;
            if (Math.abs(diffX) > 30 && !isSwiping) { 
                 isSwiping = true;
                 if (diffX > 0) { 
                     element.classList.add('swiped');
                 } else { 
                     element.classList.remove('swiped');
                 }
            }
        }, { passive: true });

        element.addEventListener('touchend', (e) => {
            if (!isSwiping && Math.abs(touchStartX - e.changedTouches[0].screenX) < 10) { // Verifica se não foi swipe e se foi um toque leve
                // Lógica de clique normal (já tratada pelo listener de 'click' do li)
                element.classList.remove('swiped'); // Garante que não fique swiped em um clique
                return;
            }
            if (!isSwiping) return; 

            touchEndX = e.changedTouches[0].screenX;
            const diffX = touchStartX - touchEndX;
            
            if (diffX > 100) { 
                element.classList.add('swiped');
                const checkAction = element.querySelector('.swipe-action-check');
                const deleteAction = element.querySelector('.swipe-action-delete');
                
                const item = items.find(i => i.id === itemId);
                if (item) {
                    const handleCheckAction = async () => {
                        await updateItemInFirebase(itemId, { Comprado: !item.Comprado });
                        element.classList.remove('swiped');
                        checkAction.removeEventListener('click', handleCheckAction); // Previne múltiplos listeners
                        deleteAction.removeEventListener('click', handleDeleteAction);
                    };
                    const handleDeleteAction = async () => {
                        await removeItemFromFirebase(itemId);
                        // O item será removido da lista pela atualização do Firebase, o 'swiped' será removido se o elemento sumir.
                        // element.classList.remove('swiped'); // Pode não ser necessário se o elemento for removido
                        checkAction.removeEventListener('click', handleCheckAction);
                        deleteAction.removeEventListener('click', handleDeleteAction);
                    };

                    checkAction.addEventListener('click', handleCheckAction, { once: true }); // {once: true} é uma boa prática aqui
                    deleteAction.addEventListener('click', handleDeleteAction, { once: true });
                }
            } else if (diffX < -50 || (isSwiping && Math.abs(diffX) <=100)) { // Swipe para direita ou swipe curto
                element.classList.remove('swiped');
            }
            isSwiping = false;
            touchStartX = 0;
            touchEndX = 0;
        }, { passive: true });
    }

    function showToast(title, message, type = 'info') {
        // (sem alterações aqui)
        const toastContainer = document.querySelector('.toast-container');
        const toast = document.createElement('div');
        toast.className = `toast`; 
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
        
        toastHeader.appendChild(toastTitle);
        toastHeader.appendChild(closeButton);
        
        const toastBody = document.createElement('div');
        toastBody.className = 'toast-body';
        toastBody.textContent = message;
        
        toast.appendChild(toastHeader);
        toast.appendChild(toastBody);
        toastContainer.appendChild(toast);

        const bsToast = new bootstrap.Toast(toast, { delay: 5000 });
        bsToast.show();
        toast.addEventListener('hidden.bs.toast', () => toast.remove());
    }

    // --- Event Listeners ---
    // (sem alterações aqui, exceto que as renderizações são agora coordenadas por processAndRenderUI)
    document.getElementById('addItemForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const itemName = itemInput.value.trim();
        const itemQuantity = parseInt(itemQuantityInput.value) || 1;
        const categoryName = categorySelect.value;

        if (itemName && categoryName) {
            const itemData = { Nome: itemName, Quantidade: itemQuantity, Categoria: categoryName, Comprado: false };
            await addItemToFirebase(itemData);
            itemInput.value = '';
            itemQuantityInput.value = '1';
            if (window.innerWidth < 768) {
                const offcanvasInstance = bootstrap.Offcanvas.getInstance(document.getElementById('offcanvasMenu'));
                if (offcanvasInstance) offcanvasInstance.hide();
            }
        } else {
            showToast("Atenção", "Preencha nome do item e selecione uma categoria.", "warning");
        }
    });

    document.getElementById('addCategoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newCatName = newCategoryInput.value.trim();
        const newIcon = newCategoryIconInput.value.trim() || '📦';
        if (newCatName) {
            const success = await addCategoryToFirebase(newCatName, newIcon);
            if (success) {
                newCategoryInput.value = '';
                newCategoryIconInput.value = '';
                emojiPicker.classList.add('d-none');
            }
        } else {
            showToast("Atenção", "Insira o nome da nova categoria.", "warning");
        }
    });

    emojiPickerButton.addEventListener('click', () => {
        emojiPicker.classList.toggle('d-none');
        if (!emojiPicker.classList.contains('d-none')) renderEmojiPicker();
    });
    
    editEmojiPickerButton.addEventListener('click', () => {
        editEmojiPicker.classList.toggle('d-none');
        if (!editEmojiPicker.classList.contains('d-none')) renderEditEmojiPicker();
    });

    saveCategoryChanges.addEventListener('click', async () => {
        const catId = editCategoryId.value;
        const oldCatName = editCategoryOldName.value;
        const newCatName = editCategoryName.value.trim();
        const newCatIcon = editCategoryIcon.value.trim() || '📦';
        
        if (!newCatName) {
            showToast("Atenção", "O nome da categoria não pode ser vazio.", "warning");
            return;
        }
        editCategoryModalInstance.hide();
        await editCategoryInFirebase(catId, oldCatName, newCatName, newCatIcon);
    });
    
    deleteOptionMove.addEventListener('change', () => moveToCategory.classList.toggle('d-none', !deleteOptionMove.checked));
    deleteOptionRemove.addEventListener('change', () => moveToCategory.classList.add('d-none'));
    
    confirmDeleteCategory.addEventListener('click', async () => {
        const catId = deleteCategoryIdField.value;
        const catName = deleteCategoryName.textContent;
        const deleteOpt = document.querySelector('input[name="deleteOption"]:checked').value;
        let targetCatName = null;
        
        if (deleteOpt === 'move') {
            targetCatName = moveToSelect.value;
            if (!targetCatName) {
                showToast("Atenção", "Selecione uma categoria de destino.", "warning");
                return;
            }
        }
        deleteCategoryModalInstance.hide();
        await deleteCategoryFromFirebase(catId, catName, deleteOpt, targetCatName);
    });
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => updateFilter(button.dataset.filter));
    });
    
    searchInput.addEventListener('input', (e) => updateSearch(e.target.value.trim()));
    searchInputMobile.addEventListener('input', (e) => updateSearch(e.target.value.trim()));
    
    // --- Inicialização ---
    // Os listeners do Firebase ('categoryOrderRef.on', 'categoriesRef.on', 'itemsRef.on') 
    // cuidam do carregamento inicial e chamam processAndRenderUI() ou renderList() conforme necessário.
});
