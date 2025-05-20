// Certifique-se de que o Firebase SDK (firebase-app.js, firebase-database.js v8.x.x)
// e suas configurações (firebaseConfig) estejam incluídos no seu arquivo index.html
// em tags <script> ANTES deste script.
// O index.html deve inicializar o app Firebase e criar as referências 'database', 'itemsRef', 'categoriesRef', e 'categoryOrderRef'.

document.addEventListener('DOMContentLoaded', function () {
    // --- Referências aos Elementos HTML ---
    const fabAddItemButton = document.getElementById('fabAddItem');
    const addItemForm = document.getElementById('addItemForm'); 
    const addCategoryForm = document.getElementById('addCategoryForm'); 
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
    
    const offcanvasMenuElement = document.getElementById('offcanvasMenu'); 
    const bsOffcanvas = new bootstrap.Offcanvas(offcanvasMenuElement); 
    const editCategoryModalInstance = new bootstrap.Modal(editCategoryModal);
    const deleteCategoryModalInstance = new bootstrap.Modal(deleteCategoryModal);

    const fabIcon = fabAddItemButton.querySelector('i'); // Referência ao ícone do FAB

    // --- Estado da Aplicação ---
    let categories = []; 
    let items = []; 
    let currentFilter = 'all';
    let searchTerm = '';
    let sortableInstance = null;
    let localRawCategories = []; 
    let localCategoryOrderFromFirebase = []; 

    const emojis = ['🍎', '🥦', '🥛', '🍖', '🍹', '🍞', '🍗', '🍇', '🍉', '🍌', '🍒', '🥕', '🥩', '🍤', '🍰', '🍪', '🍕', '🌽', '🍅', '🥥', '🛒', '🛍️', '📋', '📍', '🧀', '🥚', '🥓', '🥖', '🥐', '🧈', '🧂', '🥫', '🥔', '🍠', '🍯', '🥜', '🫘', '🍝', '🥞', '🧊', '🧃', '🧴', '🧻', '🧼', '🧹', '🧺', '🪣', '🧷', '🪒', '🪥', '🧸', '📱', '💻', '🔋', '💡', '🧾'];

    if (typeof firebase === 'undefined' || typeof database === 'undefined' || typeof itemsRef === 'undefined' || typeof categoriesRef === 'undefined' || typeof categoryOrderRef === 'undefined') {
        console.error("Firebase SDK ou referências não carregadas.");
        showToast("Erro de Configuração", "Falha na conexão com o banco de dados.", "danger");
        return;
    }

    function processAndRenderUI() {
        let orderedCategoriesForUI = [];
        if (localRawCategories.length > 0) {
            if (localCategoryOrderFromFirebase.length > 0) {
                localCategoryOrderFromFirebase.forEach(catId => {
                    const category = localRawCategories.find(c => c.id === catId);
                    if (category) orderedCategoriesForUI.push(category);
                });
                localRawCategories.forEach(cat => {
                    if (!orderedCategoriesForUI.find(oc => oc.id === cat.id)) orderedCategoriesForUI.push(cat); 
                });
            } else {
                orderedCategoriesForUI = [...localRawCategories];
            }
        }
        categories = orderedCategoriesForUI; 
        renderCategorySelect();
        renderCategoryManagement(); 
        renderList(); 
        renderMoveToSelect(); 
    }

    categoryOrderRef.on('value', (snapshot) => {
        localCategoryOrderFromFirebase = Array.isArray(snapshot.val()) ? snapshot.val() : [];
        processAndRenderUI(); 
    }, (error) => showToast("Erro de Sincronização", "Falha ao carregar ordem das categorias.", "danger"));

    categoriesRef.on('value', (snapshot) => {
        localRawCategories = []; 
        if (snapshot.val()) Object.keys(snapshot.val()).forEach(key => localRawCategories.push({ id: key, ...snapshot.val()[key] }));
        processAndRenderUI(); 
    }, (error) => showToast("Erro de Sincronização", "Falha ao carregar categorias.", "danger"));

    itemsRef.on('value', (snapshot) => {
        items = [];
        if (snapshot.val()) Object.keys(snapshot.val()).forEach(key => items.push({ id: key, ...snapshot.val()[key] }));
        renderList(); 
        renderCategoryManagement(); 
    }, (error) => showToast("Erro de Sincronização", "Falha ao carregar itens.", "danger"));

    async function addItemToFirebase(itemData) {
        try {
            await itemsRef.push(itemData);
            showToast("Sucesso", `"${itemData.Nome}" adicionado.`, "success");
        } catch (error) { showToast("Erro", "Falha ao adicionar item.", "danger"); }
    }

    async function updateItemInFirebase(itemId, updatedData) {
         try { await itemsRef.child(itemId).update(updatedData); } 
         catch (error) { showToast("Erro", "Falha ao atualizar item.", "danger"); }
    }

    async function removeItemFromFirebase(itemId, itemName) {
         try {
             await itemsRef.child(itemId).remove();
             showToast("Sucesso", `"${itemName}" removido.`, "success");
         } catch (error) { showToast("Erro", "Falha ao remover item.", "danger"); }
    }
    
    async function updateItemsCategory(oldCategoryName, newCategoryName) {
        try {
            const itemsToUpdate = items.filter(item => item.Categoria === oldCategoryName);
            if (itemsToUpdate.length === 0) return;
            const updates = {};
            itemsToUpdate.forEach(item => updates[`${item.id}/Categoria`] = newCategoryName);
            await itemsRef.update(updates);
        } catch (error) {
            console.error("Erro ao atualizar categoria dos itens:", error);
            showToast("Erro", "Não foi possível atualizar a categoria dos itens.", "danger");
            throw error;
        }
    }

    async function removeItemsByCategory(categoryName) {
        try {
            const itemsToRemove = items.filter(item => item.Categoria === categoryName);
            if (itemsToRemove.length === 0) return;
            const updates = {};
            itemsToRemove.forEach(item => updates[item.id] = null);
            await itemsRef.update(updates);
        } catch (error) {
            console.error("Erro ao remover itens da categoria:", error);
            showToast("Erro", "Não foi possível remover os itens da categoria.", "danger");
            throw error;
        }
    }

    async function moveItemsToCategory(fromCategoryName, toCategoryName) {
        try {
            const itemsToMove = items.filter(item => item.Categoria === fromCategoryName);
            if (itemsToMove.length === 0) return;
            const updates = {};
            itemsToMove.forEach(item => updates[`${item.id}/Categoria`] = toCategoryName);
            await itemsRef.update(updates);
        } catch (error) {
            console.error("Erro ao mover itens para outra categoria:", error);
            showToast("Erro", "Não foi possível mover os itens.", "danger");
            throw error;
        }
    }

    async function addCategoryToFirebase(name, icon = '📦') {
        if (localRawCategories.some(cat => cat.name === name)) {
            showToast("Atenção", `Categoria "${name}" já existe.`, "warning");
            return false;
        }
        try {
            const newCategoryRef = await categoriesRef.push({ name, icon });
            if (newCategoryRef.key) {
                await categoryOrderRef.set([...localCategoryOrderFromFirebase, newCategoryRef.key]); 
            }
            showToast("Sucesso", `Categoria "${name}" adicionada.`, "success");
            return true;
        } catch (error) { showToast("Erro", "Falha ao adicionar categoria.", "danger"); return false;}
    }

    async function editCategoryInFirebase(categoryId, oldName, newName, newIcon) {
        if (oldName !== newName && localRawCategories.some(cat => cat.id !== categoryId && cat.name === newName)) {
            showToast("Erro", `O nome de categoria "${newName}" já está em uso.`, "warning");
            return;
        }
        try {
            if (oldName !== newName) await updateItemsCategory(oldName, newName);
            await categoriesRef.child(categoryId).update({ name: newName, icon: newIcon });
            showToast("Sucesso", `Categoria "${oldName}" editada para "${newName}".`, "success");
        } catch (error) {
            console.error("Erro ao editar categoria:", error);
            showToast("Erro", "Não foi possível editar a categoria.", "danger");
        }
    }

    async function deleteCategoryFromFirebase(categoryId, categoryName, option = 'remove', targetCategoryName = null) {
        try {
            if (option === 'move' && targetCategoryName) await moveItemsToCategory(categoryName, targetCategoryName);
            else await removeItemsByCategory(categoryName);
            await categoriesRef.child(categoryId).remove();
            const updatedOrder = localCategoryOrderFromFirebase.filter(id => id !== categoryId);
            await categoryOrderRef.set(updatedOrder);
            showToast("Sucesso", `Categoria "${categoryName}" removida.`, "success");
        } catch (error) {
            console.error("Erro ao excluir categoria:", error);
            showToast("Erro", "Não foi possível excluir a categoria.", "danger");
        }
    }
    
    async function updateCategoryOrderAndPersist(orderedCategoryIds) {
        localCategoryOrderFromFirebase = orderedCategoryIds; 
        processAndRenderUI(); 
        try { await categoryOrderRef.set(orderedCategoryIds); } 
        catch (error) { showToast("Erro", "Falha ao salvar ordem das categorias.", "danger");}
    }

    function getFilteredItems() {
        let filtered = [...items];
        if (currentFilter === 'pending') filtered = filtered.filter(item => !item.Comprado);
        else if (currentFilter === 'bought') filtered = filtered.filter(item => item.Comprado);
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(item => 
                item.Nome.toLowerCase().includes(term) || 
                (item.Categoria && item.Categoria.toLowerCase().includes(term)) 
            );
        }
        return filtered;
    }

    function updateFilter(filter) {
        if (filter === 'all' && searchTerm !== '') updateSearch('');
        currentFilter = filter;
        filterButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === filter));
        renderList();
    }

    function updateSearch(term) {
        const oldSearchTerm = searchTerm;
        searchTerm = term.toLowerCase(); 
        if (searchInput.value.toLowerCase() !== searchTerm) searchInput.value = term;
        if (searchInputMobile.value.toLowerCase() !== searchTerm) searchInputMobile.value = term;
        renderList();
        if (term && document.activeElement === searchInputMobile && oldSearchTerm !== searchTerm) {
            const filteredItems = getFilteredItems();
            if (filteredItems.length > 0) {
                showToast("Busca", `Encontrado: ${filteredItems[0].Nome}`, "info")
                bsOffcanvas.hide(); 
            } else {
                showToast("Busca", `Nenhum item para "${term}"`, "warning");
            }
        }
    }

    function renderCategorySelect() {
        const currentCategoryValue = categorySelect.value;
        categorySelect.innerHTML = '<option value="" disabled>Selecione a categoria</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name; 
            option.textContent = `${category.icon} ${category.name}`;
            categorySelect.appendChild(option);
        });
        if (categories.some(c => c.name === currentCategoryValue)) categorySelect.value = currentCategoryValue;
        else categorySelect.selectedIndex = 0;
    }
    
    function renderMoveToSelect(excludeCategoryName = '') {
        moveToSelect.innerHTML = '';
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
        if (categories.length === 0) {
            categoryManagementList.innerHTML = '<p class="text-muted small">Nenhuma categoria cadastrada.</p>';
            return;
        }
        categories.forEach(category => {
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
            categoryInfo.appendChild(categoryIconEl);
            categoryInfo.appendChild(categoryNameEl);
            const categoryActions = document.createElement('div');
            categoryActions.className = 'category-item-actions';
            const editButton = document.createElement('button');
            editButton.className = 'btn-category-edit'; 
            editButton.innerHTML = '<i class="bi bi-pencil-fill"></i>'; 
            editButton.title = `Editar ${category.name}`;
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
            deleteButton.innerHTML = '<i class="bi bi-trash-fill"></i>'; 
            deleteButton.title = `Excluir ${category.name}`;
            deleteButton.addEventListener('click', () => {
                deleteCategoryIdField.value = category.id; 
                deleteCategoryName.textContent = category.name; 
                renderMoveToSelect(category.name); 
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
            animation: 150, handle: '.drag-handle', ghostClass: 'dragging',
            onEnd: async (evt) => await updateCategoryOrderAndPersist(Array.from(evt.to.children).map(item => item.dataset.id))
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
        if (filteredItems.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'text-center p-4 text-muted';
            if (searchTerm) emptyMessage.innerHTML = `<i class="bi bi-search display-4 mb-3"></i><p class="fs-5">Nenhum item encontrado para "${searchTerm}"</p>`;
            else if (currentFilter === 'pending') emptyMessage.innerHTML = `<i class="bi bi-cart-x display-4 mb-3"></i><p class="fs-5">Nenhum item pendente na lista.</p>`;
            else if (currentFilter === 'bought') emptyMessage.innerHTML = `<i class="bi bi-cart-check display-4 mb-3"></i><p class="fs-5">Nenhum item comprado na lista.</p>`;
            else emptyMessage.innerHTML = `<i class="bi bi-clipboard-x display-4 mb-3"></i><p class="fs-5">Sua lista de compras está vazia.</p><p class="small text-body-secondary">Adicione itens usando o menu <i class="bi bi-list"></i> ou o botão <i class="bi bi-plus-lg"></i>.</p>`;
            shoppingList.appendChild(emptyMessage);
            return;
        }
        const itemsByCategory = {};
        filteredItems.forEach(item => {
            const categoryName = item.Categoria || 'Sem Categoria';
            if (!itemsByCategory[categoryName]) itemsByCategory[categoryName] = [];
            itemsByCategory[categoryName].push(item);
        });
        categories.forEach(category => {
            const categoryItems = itemsByCategory[category.name];
            if (categoryItems && categoryItems.length > 0) {
                const categoryHeader = document.createElement('div');
                categoryHeader.className = 'category-header';
                const headerLeft = document.createElement('div');
                headerLeft.className = 'category-header-left';
                const categoryIcon = document.createElement('span');
                categoryIcon.className = 'category-icon';
                categoryIcon.textContent = category.icon;
                const categoryNameH6 = document.createElement('h6'); 
                categoryNameH6.className = 'category-name';
                categoryNameH6.textContent = category.name;
                const itemCountSpan = document.createElement('span');
                itemCountSpan.className = 'item-count';
                itemCountSpan.textContent = categoryItems.length;
                headerLeft.appendChild(categoryIcon);
                headerLeft.appendChild(categoryNameH6);
                headerLeft.appendChild(itemCountSpan);
                categoryHeader.appendChild(headerLeft);
                shoppingList.appendChild(categoryHeader);
                categoryItems.forEach(item => {
                    const listItem = document.createElement('li');
                    listItem.className = 'list-group-item'; 
                    listItem.dataset.id = item.id;
                    if (item.Comprado) listItem.classList.add('bought');
                    const itemContentDiv = document.createElement('div');
                    itemContentDiv.className = 'item-content';
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'form-check-input'; 
                    checkbox.checked = item.Comprado;
                    checkbox.setAttribute('aria-label', `Marcar ${item.Nome}`);
                    const itemNameSpan = document.createElement('span');
                    itemNameSpan.className = 'item-name';
                    itemNameSpan.textContent = item.Nome;
                    itemContentDiv.appendChild(checkbox);
                    itemContentDiv.appendChild(itemNameSpan);
                    const itemActionsDiv = document.createElement('div');
                    itemActionsDiv.className = 'item-actions';
                    const itemQuantitySpan = document.createElement('span');
                    itemQuantitySpan.className = 'item-quantity'; 
                    itemQuantitySpan.textContent = `Qtd: ${item.Quantidade}`;
                    itemActionsDiv.appendChild(itemQuantitySpan);
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn-delete'; 
                    deleteBtn.innerHTML = '<i class="bi bi-trash-fill"></i>';
                    deleteBtn.setAttribute('aria-label', `Remover ${item.Nome}`);
                    deleteBtn.title = `Remover ${item.Nome}`;
                    deleteBtn.addEventListener('click', async (e) => {
                        e.stopPropagation(); 
                        if (confirm(`Tem certeza que deseja excluir "${item.Nome}"?`)) await removeItemFromFirebase(item.id, item.Nome);
                    });
                    itemActionsDiv.appendChild(deleteBtn);
                    listItem.appendChild(itemContentDiv);
                    listItem.appendChild(itemActionsDiv);
                    itemContentDiv.addEventListener('click', async () => {
                        checkbox.checked = !checkbox.checked; 
                        await updateItemInFirebase(item.id, { Comprado: checkbox.checked });
                    });
                    shoppingList.appendChild(listItem);
                });
            }
        });
        const uncategorizedItems = itemsByCategory['Sem Categoria'];
        if (uncategorizedItems && uncategorizedItems.length > 0) {
            // (código para renderizar itens sem categoria - mantido)
        }
    }

    function showToast(title, message, type = 'info') { 
        const toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`; 
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        const toastHeader = document.createElement('div');
        toastHeader.className = 'toast-header'; 
        let iconClass = 'bi-info-circle-fill';
        if (type === 'success') iconClass = 'bi-check-circle-fill';
        if (type === 'warning') iconClass = 'bi-exclamation-triangle-fill';
        if (type === 'danger') iconClass = 'bi-x-octagon-fill';
        toastHeader.innerHTML = `<i class="bi ${iconClass} me-2"></i><strong class="me-auto">${title}</strong><button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Fechar"></button>`;
        if (type === 'warning') toastHeader.querySelector('.btn-close').classList.remove('btn-close-white');
        const toastBody = document.createElement('div');
        toastBody.className = 'toast-body';
        toastBody.textContent = message;
        toast.appendChild(toastHeader);
        toast.appendChild(toastBody);
        toastContainer.appendChild(toast);
        const bsToast = new bootstrap.Toast(toast, { delay: 3000, autohide: true }); 
        bsToast.show();
        toast.addEventListener('hidden.bs.toast', () => toast.remove()); 
    }

    // --- Event Listeners ---
    addItemForm.addEventListener('submit', async (e) => { 
        e.preventDefault();
        const itemNameVal = itemInput.value.trim();
        const itemQuantityVal = parseInt(itemQuantityInput.value) || 1;
        const itemCategoryVal = categorySelect.value;
        if (!itemNameVal || !itemCategoryVal) {
            showToast("Atenção", "Nome do item e categoria são obrigatórios.", "warning");
            return;
        }
        await addItemToFirebase({ Nome: itemNameVal, Quantidade: itemQuantityVal, Categoria: itemCategoryVal, Comprado: false });
        itemInput.value = '';
        itemQuantityInput.value = '1';
        itemInput.focus();
    });
    
    addCategoryForm.addEventListener('submit', async (e) => { 
        e.preventDefault();
        const categoryNameVal = newCategoryInput.value.trim();
        const categoryIconVal = newCategoryIconInput.value.trim() || '📦';
        if (!categoryNameVal) {
            showToast("Atenção", "O nome da categoria é obrigatório.", "warning");
            return;
        }
        const success = await addCategoryToFirebase(categoryNameVal, categoryIconVal);
        if (success) {
            newCategoryInput.value = '';
            newCategoryIconInput.value = '';
            emojiPicker.classList.add('d-none');
        }
    });
    
    saveCategoryChanges.addEventListener('click', async () => { 
        const categoryIdVal = editCategoryId.value;
        const oldNameVal = editCategoryOldName.value;
        const newNameVal = editCategoryName.value.trim();
        const newIconVal = editCategoryIcon.value.trim() || '📦';
        if (!newNameVal) {
            showToast("Atenção", "O nome da categoria é obrigatório.", "warning");
            return;
        }
        await editCategoryInFirebase(categoryIdVal, oldNameVal, newNameVal, newIconVal);
        editCategoryModalInstance.hide();
    });
    
    deleteOptionMove.addEventListener('change', () => moveToCategory.classList.toggle('d-none', !deleteOptionMove.checked));
    deleteOptionRemove.addEventListener('change', () => moveToCategory.classList.toggle('d-none', deleteOptionMove.checked));
    
    confirmDeleteCategory.addEventListener('click', async () => { 
        const categoryIdVal = deleteCategoryIdField.value;
        const categoryNameVal = deleteCategoryName.textContent;
        const optionVal = deleteOptionMove.checked ? 'move' : 'remove';
        const targetCategoryVal = optionVal === 'move' ? moveToSelect.value : null;
        if (optionVal === 'move' && !targetCategoryVal) {
            showToast("Atenção", "Selecione uma categoria de destino para mover os itens.", "warning");
            return;
        }
        await deleteCategoryFromFirebase(categoryIdVal, categoryNameVal, optionVal, targetCategoryVal);
        deleteCategoryModalInstance.hide();
    });
    
    filterButtons.forEach(button => button.addEventListener('click', () => updateFilter(button.dataset.filter)));
    
    searchInput.addEventListener('input', () => updateSearch(searchInput.value));
    searchInputMobile.addEventListener('input', () => updateSearch(searchInputMobile.value));

    emojiPickerButton.addEventListener('click', () => { 
        emojiPicker.classList.toggle('d-none');
        if (!emojiPicker.classList.contains('d-none')) renderEmojiPicker();
    });
    
    editEmojiPickerButton.addEventListener('click', () => { 
        editEmojiPicker.classList.toggle('d-none');
        if (!editEmojiPicker.classList.contains('d-none')) renderEditEmojiPicker();
    });
    
    newCategoryIconInput.readOnly = true;
    editCategoryIcon.readOnly = true;
    
    // --- Controle do estado visual do FAB (Apenas Ícone) ---
    function updateFabIconState(isOffcanvasNowOpen) {
        if (isOffcanvasNowOpen) {
            if (fabIcon) {
                fabIcon.classList.remove('bi-plus-lg');
                fabIcon.classList.add('bi-x-lg');
            }
        } else {
            if (fabIcon) {
                fabIcon.classList.remove('bi-x-lg');
                fabIcon.classList.add('bi-plus-lg');
            }
        }
    }

    // Listener de clique no FAB: alterna o ícone do FAB
    fabAddItemButton.addEventListener('click', function() {
        // O Bootstrap Offcanvas usa a classe 'show' no elemento offcanvas para indicar visibilidade.
        // Se o offcanvas NÃO tem 'show' APÓS este clique (o que significa que ele está sendo aberto),
        // o ícone deve ser 'X'.
        // Se ele TEM 'show' APÓS este clique (o que significa que ele está sendo fechado),
        // o ícone deve ser '+'.
        // No entanto, o toggle do Bootstrap ainda não ocorreu totalmente neste ponto.
        // Então, verificamos o estado ANTES do toggle implícito do Bootstrap.
        const isCurrentlyHidden = !offcanvasMenuElement.classList.contains('show');
        updateFabIconState(isCurrentlyHidden); // Se estava escondido, agora vai mostrar (ícone X)
                                            // Se estava mostrando, agora vai esconder (ícone +)
    });

    // Eventos do Bootstrap para sincronização FINAL do ícone do FAB
    offcanvasMenuElement.addEventListener('shown.bs.offcanvas', function () {
        updateFabIconState(true); // Garante que o FAB está no estado 'X' após abrir
    });

    offcanvasMenuElement.addEventListener('hidden.bs.offcanvas', function () {
        updateFabIconState(false); // Garante que o FAB está no estado '+' após fechar
    });
    
    console.log("Aplicativo Lista de Compras v2.4 (FAB - ícone apenas)");
});
