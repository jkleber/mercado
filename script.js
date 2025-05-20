// Este script usa o Firebase Realtime Database (SDK v8) para armazenar e sincronizar a lista de compras.
// Certifique-se de que o Firebase SDK (firebase-app.js, firebase-database.js v8.x.x)
// e suas configurações (firebaseConfig) estejam incluídos no seu arquivo index.html
// em tags <script> ANTES deste script.
// O index.html deve inicializar o app Firebase e criar as referências 'database', 'itemsRef' e 'categoriesRef'.

document.addEventListener('DOMContentLoaded', function () {
    // --- Referências aos Elementos HTML ---
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
    const editCategoryId = document.getElementById('editCategoryId'); // Campo oculto para ID
    const editCategoryOldName = document.getElementById('editCategoryOldName'); // Campo oculto para nome antigo
    const editCategoryName = document.getElementById('editCategoryName');
    const editCategoryIcon = document.getElementById('editCategoryIcon');
    const editEmojiPickerButton = document.getElementById('editEmojiPickerButton');
    const editEmojiPicker = document.getElementById('editEmojiPicker');
    const saveCategoryChanges = document.getElementById('saveCategoryChanges');
    
    const deleteCategoryModal = document.getElementById('deleteCategoryModal');
    const deleteCategoryIdField = document.getElementById('deleteCategoryIdField'); // Campo oculto para ID
    const deleteCategoryName = document.getElementById('deleteCategoryName');
    const deleteOptionRemove = document.getElementById('deleteOptionRemove');
    const deleteOptionMove = document.getElementById('deleteOptionMove');
    const moveToCategory = document.getElementById('moveToCategory');
    const moveToSelect = document.getElementById('moveToSelect');
    const confirmDeleteCategory = document.getElementById('confirmDeleteCategory');
    
    const editCategoryModalInstance = new bootstrap.Modal(editCategoryModal);
    const deleteCategoryModalInstance = new bootstrap.Modal(deleteCategoryModal);

    // --- Estado da Aplicação ---
    let categories = []; // Agora será preenchido pelo Firebase
    let items = []; // Preenchido pelo Firebase
    let currentFilter = 'all';
    let searchTerm = '';
    let sortableInstance = null;

    const emojis = ['🍎', '🥦', '🥛', '🍖', '🍹', '🍞', '🍗', '🍇', '🍉', '🍌', '🍒', '🥕', '🥩', '🍤', '🍰', '🍪', '🍕', '🌽', '🍅', '🥥', '🛒', '🛍️', '📋', '📍', '🧀', '🥚', '🥓', '🥖', '🥐', '🧈', '🧂', '🥫', '🥔', '🍠', '🍯', '🥜', '🫘', '🍝', '🥞', '🧊', '🧃', '🧴', '🧻', '🧼', '🧹', '🧺', '🪣', '🧷', '🪒', '🪥', '🧸', '📱', '💻', '🔋', '💡', '🧾'];

    // --- Inicialização e Conexão com Firebase ---
    if (typeof firebase === 'undefined' || typeof database === 'undefined' || typeof itemsRef === 'undefined' || typeof categoriesRef === 'undefined') {
        console.error("Firebase SDK ou referências de banco de dados não carregadas corretamente no index.html.");
        showToast("Erro", "Erro na configuração do Firebase. Verifique o arquivo index.html.", "danger");
        return;
    }

    // --- Sincronização em Tempo Real com Firebase ---

    // Ouve mudanças nas categorias
    categoriesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        categories = [];
        if (data) {
            Object.keys(data).forEach(key => {
                categories.push({
                    id: key,
                    ...data[key] // name, icon
                });
            });
        }
        // Manter a ordem local se já houver uma definida pelo sortable
        // Esta é uma simplificação. Para persistência de ordem real, um campo 'orderIndex' seria necessário.
        // Por ora, a reordenação manual via SortableJS afetará a 'categories' array local.
        // Se categories foi reordenado localmente, tentamos manter essa ordem.
        const localOrder = categories.map(c => c.id);
        categories.sort((a, b) => {
            const indexA = localOrder.indexOf(a.id);
            const indexB = localOrder.indexOf(b.id);
            if (indexA !== -1 && indexB !== -1) {
                return indexA - indexB;
            }
            return 0; // ou outra lógica de ordenação padrão
        });

        console.log('Categorias do Firebase recebidas:', categories);
        renderCategorySelect();
        renderCategoryManagement();
        renderList(); // Re-renderiza a lista de itens pois os ícones das categorias podem ter mudado
    }, (error) => {
        console.error("Erro ao sincronizar categorias com Firebase:", error);
        showToast("Erro", "Erro ao carregar categorias.", "danger");
    });

    // Ouve mudanças nos itens
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
        renderList();
        renderCategoryManagement(); // Atualiza contadores de itens por categoria
    }, (error) => {
        console.error("Erro ao sincronizar itens com Firebase:", error);
        showToast("Erro", "Erro ao carregar lista de compras.", "danger");
    });


    // --- Funções de Interação com Firebase (Itens) ---
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

    async function addCategoryToFirebase(name, icon = '📦') {
        if (categories.some(cat => cat.name === name)) {
            showToast("Atenção", `A categoria "${name}" já existe.`, "warning");
            return false;
        }
        try {
            await categoriesRef.push({ name, icon });
            showToast("Sucesso", `Categoria "${name}" adicionada.`, "success");
            return true;
        } catch (error) {
            console.error("Erro ao adicionar categoria ao Firebase:", error);
            showToast("Erro", "Erro ao adicionar categoria.", "danger");
            return false;
        }
    }

    async function editCategoryInFirebase(categoryId, oldName, newName, newIcon) {
        // Verifica se o novo nome já existe em outra categoria
        if (oldName !== newName && categories.some(cat => cat.id !== categoryId && cat.name === newName)) {
            showToast("Erro", `A categoria "${newName}" já existe.`, "warning");
            return;
        }
        
        try {
            // Se o nome da categoria mudou, atualiza os itens primeiro
            if (oldName !== newName) {
                await updateItemsCategory(oldName, newName);
            }
            
            // Atualiza a categoria no Firebase
            await categoriesRef.child(categoryId).update({ name: newName, icon: newIcon });
            
            showToast("Sucesso", `Categoria "${oldName}" editada para "${newName}".`, "success");
            // UI será atualizada pelo listener categoriesRef.on('value')
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
            showToast("Sucesso", `Categoria "${categoryName}" removida.`, "success");
            // UI será atualizada pelos listeners
        } catch (error) {
            console.error("Erro ao excluir categoria:", error);
            showToast("Erro", "Erro ao excluir categoria.", "danger");
        }
    }
    
    function reorderCategories(orderedCategoryIds) {
        const reordered = [];
        orderedCategoryIds.forEach(id => {
            const category = categories.find(cat => cat.id === id);
            if (category) {
                reordered.push(category);
            }
        });
        // Adiciona quaisquer categorias que não estavam na lista ordenada (novas categorias, por exemplo)
        categories.forEach(cat => {
            if (!reordered.find(rcat => rcat.id === cat.id)) {
                reordered.push(cat);
            }
        });
        categories = reordered;
        
        // Re-renderiza as partes da UI que dependem da ordem das categorias
        renderCategorySelect();
        renderList();
        // Note: renderCategoryManagement() é chamado separadamente e renderiza na ordem atual de 'categories'
    }

    // --- Funções de Filtragem e Busca ---
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
                item.Categoria.toLowerCase().includes(term)
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
        searchInput.value = term;
        searchInputMobile.value = term;
        renderList();
    }

    // --- Funções de Renderização da UI ---
    function renderCategorySelect() {
        const currentCategoryValue = categorySelect.value;
        categorySelect.innerHTML = '<option value="" disabled>Selecione a categoria</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.name; // O valor continua sendo o nome da categoria para compatibilidade com item.Categoria
            option.textContent = `${category.icon} ${category.name}`;
            categorySelect.appendChild(option);
        });
        // Tenta restaurar a seleção anterior se ainda válida
        if (categories.some(c => c.name === currentCategoryValue)) {
            categorySelect.value = currentCategoryValue;
        } else {
             categorySelect.selectedIndex = 0; // Seleciona "Selecione a categoria"
        }
        renderMoveToSelect();
    }
    
    function renderMoveToSelect(excludeCategoryName = '') {
        moveToSelect.innerHTML = '';
        categories
            .filter(category => category.name !== excludeCategoryName)
            .forEach(category => {
                const option = document.createElement('option');
                option.value = category.name; // O valor é o nome da categoria
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
            const itemCount = items.filter(item => item.Categoria === category.name).length;
            
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.dataset.id = category.id; // Usar ID do Firebase
            categoryItem.dataset.name = category.name; // Guardar nome para reordenação
            
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
                editCategoryId.value = category.id; // ID da categoria
                editCategoryOldName.value = category.name; // Nome antigo
                editCategoryName.value = category.name;   // Nome atual para edição
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
                deleteCategoryIdField.value = category.id; // ID da categoria
                deleteCategoryName.textContent = category.name; // Nome para exibição
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
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'dragging',
            onEnd: function(evt) {
                const orderedCategoryIds = Array.from(categoryManagementList.children)
                    .map(item => item.dataset.id); // Reordenar por ID
                reorderCategories(orderedCategoryIds);
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
        
        if (filteredItems.length === 0) {
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

        // Usar a ordem da 'categories' array (que é sincronizada com Firebase e pode ser reordenada localmente)
        categories.forEach(category => {
            const categoryName = category.name;
            if (grouped[categoryName]) {
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
                        item.Comprado = newBoughtStatus; // Otimista
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
                        item.Comprado = newBoughtStatus; // Otimista
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
         // Adiciona categorias que possam existir nos itens mas não foram renderizadas (caso raro ou de inconsistência)
        Object.keys(grouped).forEach(categoryName => {
            if (!categories.find(c => c.name === categoryName)) {
                 // Lógica para renderizar itens de categorias "órfãs", se necessário
                 // Por ora, focamos nas categorias gerenciadas
                console.warn(`Itens encontrados para categoria não gerenciada: ${categoryName}`);
            }
        });
    }
    
    function initSwipeGestures(element) {
        let touchStartX = 0, touchEndX = 0, isSwiping = false;
        const itemId = element.dataset.id;
        
        element.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; isSwiping = false; }, { passive: true });
        element.addEventListener('touchmove', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const diffX = touchStartX - touchEndX;
            if (Math.abs(diffX) > 30 && !isSwiping) { // Começa a considerar swipe
                 isSwiping = true;
                 if (diffX > 0) { // Swipe para esquerda
                     element.classList.add('swiped');
                 } else { // Swipe para direita
                     element.classList.remove('swiped');
                 }
            }
        }, { passive: true });

        element.addEventListener('touchend', (e) => {
            if (!isSwiping) return; // Se não foi um swipe real, não faz nada
            touchEndX = e.changedTouches[0].screenX;
            const diffX = touchStartX - touchEndX;
            
            if (diffX > 100) { // Swipe significativo para esquerda, mantém ações visíveis
                element.classList.add('swiped');
                // Ações são adicionadas uma vez para evitar múltiplos listeners
                const checkAction = element.querySelector('.swipe-action-check');
                const deleteAction = element.querySelector('.swipe-action-delete');
                
                const item = items.find(i => i.id === itemId);
                if (item) {
                    checkAction.onclick = async () => { // Usar .onclick para sobrescrever
                        await updateItemInFirebase(itemId, { Comprado: !item.Comprado });
                        element.classList.remove('swiped');
                    };
                    deleteAction.onclick = async () => { // Usar .onclick para sobrescrever
                        await removeItemFromFirebase(itemId);
                        // O item será removido da lista pela atualização do Firebase
                    };
                }
            } else if (diffX < -50) { // Swipe para direita, esconde ações
                element.classList.remove('swiped');
            } else if (isSwiping && Math.abs(diffX) <= 100 && diffX > 0 ) {
                // Se foi um swipe curto para a esquerda, não mantém aberto, mas também não executa ação de clique
                // Pode ser necessário ajustar essa lógica se o clique for disparado indevidamente
                // element.classList.remove('swiped'); // Opcional: resetar se o swipe não foi "forte" o suficiente
            }
            isSwiping = false;
            touchStartX = 0;
            touchEndX = 0;
        }, { passive: true });
    }

    function showToast(title, message, type = 'info') {
        const toastContainer = document.querySelector('.toast-container');
        const toast = document.createElement('div');
        toast.className = `toast`; // Removido 'show' para animação Bootstrap
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
            // categorySelect.selectedIndex = 0; // Não reseta para permitir adicionar vários itens na mesma categoria
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
    // Os listeners do Firebase ('categoriesRef.on' e 'itemsRef.on') já cuidam do carregamento inicial.
    // Renderizações iniciais são chamadas dentro desses listeners.
    // Não são necessárias categorias iniciais fixas, pois virão do Firebase.
    // Se o Firebase estiver vazio, as listas de categorias e itens começarão vazias.
});

