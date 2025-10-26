document.addEventListener('DOMContentLoaded', () => {

    // --- VARIABLEN & DOM-ELEMENTE ---

    let db;
    let currentView = 'list';

    // Header
    const viewToggleBtn = document.getElementById('view-toggle-btn');
    const addSubjectBtn = document.getElementById('add-subject-btn');
    
    // Ansichten
    const listView = document.getElementById('list-view');
    const columnView = document.getElementById('column-view');

    // Modals
    const modalBackdrop = document.getElementById('modal-backdrop');
    const addSubjectModal = document.getElementById('add-subject-modal');
    const addTaskModal = document.getElementById('add-task-modal');
    const editTaskModal = document.getElementById('edit-task-modal');
    const deleteSubjectModal = document.getElementById('delete-subject-modal'); 

    // Felder "Neues Fach"
    const subjectNameInput = document.getElementById('subject-name-input');
    const saveSubjectBtn = document.getElementById('save-add-subject');
    const cancelSubjectBtn = document.getElementById('cancel-add-subject');

    // Felder "Neue Aufgabe"
    const taskSubjectIdInput = document.getElementById('task-subject-id-input');
    const taskDescInput = document.getElementById('task-desc-input');
    const taskDueDateInput = document.getElementById('task-due-date-input');
    const addTaskPriorityToggle = document.getElementById('add-task-priority-toggle'); // NEU
    const saveTaskBtn = document.getElementById('save-add-task');
    const cancelTaskBtn = document.getElementById('cancel-add-task');

    // Felder "Aufgabe bearbeiten"
    const editTaskIdInput = document.getElementById('edit-task-id-input');
    const editTaskDescInput = document.getElementById('edit-task-desc-input');
    const editTaskDueDateInput = document.getElementById('edit-task-due-date-input');
    const editTaskPriorityToggle = document.getElementById('edit-task-priority-toggle'); // NEU
    const saveEditTaskBtn = document.getElementById('save-edit-task');
    const cancelEditTaskBtn = document.getElementById('cancel-edit-task');

    // Felder "Fach löschen"
    const deleteSubjectIdInput = document.getElementById('delete-subject-id-input');
    const deleteSubjectName = document.getElementById('delete-subject-name');
    const cancelDeleteSubjectBtn = document.getElementById('cancel-delete-subject');
    const confirmDeleteSubjectBtn = document.getElementById('confirm-delete-subject');
    
    // Icons
    const LIST_VIEW_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24"><path d="M440 856V616H200v240h240Zm320 0V616H520v240h240ZM200 536V296h240v240H200Zm320 0V296h240v240H520Z"/></svg>`;
    const COLUMN_VIEW_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24"><path d="M200 856V296h120v560H200Zm240 0V296h120v560H440Zm240 0V296h120v560H680Z"/></svg>`;
    
    // Icon für Lösch-Knopf
    const DELETE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24"><path d="M280 936q-33 0-56.5-23.5T200 856V336h-40v-80h200v-40h320v40h200v80h-40v520q0 33-23.5 56.5T680 936H280Zm400-600H280v520h400V336ZM360 776h80V416h-80v360Zm160 0h80V416h-80v360ZM280 336v520-520Z"/></svg>`;

    // NEU: Icon für "Wichtig" auf der Task-Karte
    const PRIORITY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24"><path d="M480 976q-33 0-56.5-23.5T400 896q0-33 23.5-56.5T480 816q33 0 56.5 23.5T560 896q0 33-23.5 56.5T480 976Zm-40-200v-480h80v480h-80Z"/></svg>`;


    // --- SPEICHER-PERSISTENZ ANFORDERN ---

    async function requestPersistentStorage() {
        if (navigator.storage && navigator.storage.persist) {
            try {
                const isPersisted = await navigator.storage.persisted();
                console.log(`Speicher ist ${isPersisted ? 'bereits' : 'nicht'} persistent.`);
                
                if (!isPersisted) {
                    const persisted = await navigator.storage.persist();
                    if (persisted) {
                        console.log("Speicher wurde erfolgreich als 'persistent' markiert!");
                    } else {
                        console.warn("Speicher konnte NICHT als 'persistent' markiert werden.");
                    }
                }
            } catch (error) {
                console.error("Fehler bei der Abfrage der Speicher-Persistenz:", error);
            }
        } else {
            console.log("Die Persistent Storage API wird von diesem Browser nicht unterstützt.");
        }
    }

    // --- DATENBANK (INDEXEDDB) ---

    function initDatabase() {
        // ... (unverändert) ...
        const request = indexedDB.open('SchoolAppDB', 1);

        request.onerror = (event) => {
            console.error('Datenbank-Fehler:', event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Datenbank erfolgreich geöffnet.');
            loadAndRenderAll();
        };

        request.onupgradeneeded = (event) => {
            let db = event.target.result;
            if (!db.objectStoreNames.contains('subjects')) {
                db.createObjectStore('subjects', { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('tasks')) {
                const tasksStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
                tasksStore.createIndex('subjectId', 'subjectId', { unique: false });
            }
        };
    }

    function getFromDB(storeName, id) {
        // ... (unverändert) ...
        return new Promise((resolve, reject) => {
            if (!db) return reject("DB nicht initialisiert");
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    function getAllFromDB(storeName) {
        // ... (unverändert) ...
        return new Promise((resolve, reject) => {
            if (!db) return reject("DB nicht initialisiert");
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    function addToDB(storeName, data) {
        // ... (unverändert) ...
        return new Promise((resolve, reject) => {
            if (!db) return reject("DB nicht initialisiert");
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    function updateInDB(storeName, data) {
        // ... (unverändert) ...
        return new Promise((resolve, reject) => {
            if (!db) return reject("DB nicht initialisiert");
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    function deleteFromDB(storeName, id) {
        // ... (unverändert) ...
        return new Promise((resolve, reject) => {
            if (!db) return reject("DB nicht initialisiert");
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }

    // Funktion zum Löschen eines Fachs UND aller zugehörigen Aufgaben
    function deleteSubjectAndTasks(subjectId) {
        return new Promise(async (resolve, reject) => {
            if (!db) return reject("DB nicht initialisiert");
            
            try {
                // 1. Alle Tasks für dieses Fach finden
                const allTasks = await getAllFromDB('tasks');
                const tasksToDelete = allTasks.filter(t => t.subjectId === subjectId);

                // 2. Eine Transaktion für BEIDE Stores starten
                const transaction = db.transaction(['subjects', 'tasks'], 'readwrite');
                const subjectStore = transaction.objectStore('subjects');
                const taskStore = transaction.objectStore('tasks');

                transaction.onerror = (e) => reject(e.target.error);
                transaction.oncomplete = () => {
                    console.log('Liste und Tasks gelöscht');
                    resolve();
                };

                // 3. Alle zugehörigen Tasks löschen
                tasksToDelete.forEach(task => taskStore.delete(task.id));
                
                // 4. Das Fach selbst löschen
                subjectStore.delete(subjectId);

            } catch (error) {
                reject(error);
            }
        });
    }


    // --- MODAL (POP-UP) STEUERUNG ---

    function showModal(modalElement) {
        modalBackdrop.classList.add('active');
        modalElement.classList.add('active');
    }

    function hideModals() {
        modalBackdrop.classList.remove('active');
        addSubjectModal.classList.remove('active');
        addTaskModal.classList.remove('active');
        editTaskModal.classList.remove('active');
        deleteSubjectModal.classList.remove('active'); 
        
        // ... (Formulare zurücksetzen) ...
        subjectNameInput.value = '';
        taskDescInput.value = '';
        taskDueDateInput.value = '';
        taskSubjectIdInput.value = '';
        editTaskIdInput.value = '';
        editTaskDescInput.value = '';
        editTaskDueDateInput.value = '';
        
        // NEU: "Wichtig"-Buttons zurücksetzen
        addTaskPriorityToggle.classList.remove('active');
        editTaskPriorityToggle.classList.remove('active');
        
        // Lösch-Modal-Felder zurücksetzen
        deleteSubjectIdInput.value = '';
        deleteSubjectName.textContent = '';
    }

    async function openEditTaskModal(taskId) {
        try {
            const task = await getFromDB('tasks', taskId);
            if (!task) return;
            editTaskIdInput.value = task.id;
            editTaskDescInput.value = task.description;
            editTaskDueDateInput.value = task.dueDate || ''; 

            // NEU: "Wichtig"-Button-Status setzen
            if (task.isImportant) {
                editTaskPriorityToggle.classList.add('active');
            } else {
                editTaskPriorityToggle.classList.remove('active');
            }

            showModal(editTaskModal);
            editTaskDescInput.focus();
        } catch (error) {
            console.error('Fehler beim Öffnen des Edit-Modals:', error);
        }
    }

    // Helper-Funktion zum Öffnen des "Fach löschen"-Modals
    async function openDeleteSubjectModal(subjectId) {
        try {
            const subject = await getFromDB('subjects', subjectId);
            if (!subject) return;
            
            deleteSubjectIdInput.value = subject.id;
            deleteSubjectName.textContent = subject.name; // Zeigt den Namen im Modal an
            showModal(deleteSubjectModal);

        } catch (error) {
            console.error('Fehler beim Öffnen des Lösch-Modals:', error);
        }
    }

    // --- RENDER-FUNKTIONEN (ZEICHNEN DER UI) ---

    // NEU: Helper-Funktion zum Sortieren der Tasks (Feature 2)
    function sortTasks(taskArray) {
        return taskArray.sort((a, b) => {
            // 1. Erledigte (isDone: true) immer nach unten
            if (a.isDone !== b.isDone) {
                return a.isDone ? 1 : -1;
            }
            
            // 2. Wichtige (isImportant: true) nach oben (nur bei offenen Tasks)
            const aImportant = a.isImportant || false; // Handle undefined
            const bImportant = b.isImportant || false; // Handle undefined
            if (aImportant !== bImportant) {
                return aImportant ? -1 : 1; // Wichtige (a) nach oben
            }
            
            // 3. Tasks ohne Fälligkeitsdatum (dueDate) nach unten
            if (a.dueDate && !b.dueDate) return -1; // a hat Datum, b nicht -> a nach oben
            if (!a.dueDate && b.dueDate) return 1;  // a hat kein Datum, b schon -> a nach unten
            if (!a.dueDate && !b.dueDate) return 0; // beide haben kein Datum -> Reihenfolge egal

            // 4. Nach Datum sortieren (älteste zuerst)
            return new Date(a.dueDate) - new Date(b.dueDate);
        });
    }

    // NEU: Helper-Funktion zum Sortieren der Listen (Feature 1)
    function sortSubjects(subjectArray, allTasks) {
        // 1. Status für jede Liste ermitteln
        const subjectsWithStatus = subjectArray.map(subject => {
            const tasksForSubject = allTasks.filter(t => t.subjectId === subject.id);
            const hasTasks = tasksForSubject.length > 0;
            const hasOpenTasks = tasksForSubject.some(t => !t.isDone);
            
            let sortGroup;
            if (hasOpenTasks) {
                sortGroup = 1; // 1. Gruppe: Hat offene Tasks
            } else if (hasTasks) {
                sortGroup = 2; // 2. Gruppe: Hat Tasks, aber alle erledigt
            } else {
                sortGroup = 3; // 3. Gruppe: Leer
            }
            
            return { ...subject, sortGroup }; // Original-Fach + Sortiergruppe
        });

        // 2. Sortieren
        return subjectsWithStatus.sort((a, b) => {
            // Zuerst nach Gruppe
            if (a.sortGroup !== b.sortGroup) {
                return a.sortGroup - b.sortGroup;
            }
            // Innerhalb der Gruppe alphabetisch nach Name
            return a.name.localeCompare(b.name);
        });
    }


    async function loadAndRenderAll() {
        const expandedSubjectIds = new Set(
            [...document.querySelectorAll('.subject-balken.expanded')]
                .map(balken => balken.dataset.subjectId) 
        );

        try {
            const [subjects, tasks] = await Promise.all([
                getAllFromDB('subjects'),
                getAllFromDB('tasks')
            ]);
            
            // NEU: Listen sortieren (Feature 1)
            const sortedSubjects = sortSubjects(subjects, tasks);
            
            renderListView(sortedSubjects, tasks, expandedSubjectIds);
            renderColumnView(sortedSubjects, tasks);

        } catch (error) {
            console.error('Fehler beim Laden und Rendern:', error);
        }
    }

    // GEÄNDERT: Akzeptiert "Wichtig"-Status (Feature 2)
    function createTaskElement(task, subjectName = null) {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card';
        taskCard.dataset.taskId = task.id;
        if (task.isDone) {
            taskCard.classList.add('is-done');
        }
        // NEU: "Wichtig"-Klasse hinzufügen
        if (task.isImportant) {
            taskCard.classList.add('is-important');
        }


        // Fügt den Fachnamen hinzu, falls übergeben
        let subjectNameHtml = '';
        if (subjectName) {
            subjectNameHtml = `<div class="task-subject-name">${subjectName}</div>`;
        }
        
        // NEU: "Wichtig"-Icon hinzufügen
        let priorityIconHtml = task.isImportant 
            ? `<span class="task-priority-icon" title="Wichtig">!</span>` 
            : '';


        let dueDateHtml = '';
        if (task.dueDate) {
            const date = new Date(task.dueDate + 'T00:00:00');
            const formattedDate = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            dueDateHtml = `<div class="task-due-date">Fällig am: ${formattedDate}</div>`;
        }

        taskCard.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.isDone ? 'checked' : ''}>
            <div class="task-details" title="Aufgabe bearbeiten">
                ${subjectNameHtml}
                <div class="task-description">
                    ${priorityIconHtml} <span>${task.description}</span> </div>
                ${dueDateHtml}
            </div>
            <button class="delete-task-btn" title="Aufgabe löschen">X</button>
        `;
        return taskCard;
    }

    // GEÄNDERT: Nutzt sortierte `subjects`
    function renderListView(subjects, tasks, expandedSubjectIds = new Set()) {
        listView.innerHTML = '';

        // --- 1. "Gesamt"-Liste ---
        const allIncompleteTasks = tasks.filter(t => !t.isDone);
        const sortedOverallTasks = sortTasks(allIncompleteTasks); 

        const overallBalken = document.createElement('div');
        overallBalken.className = 'subject-balken';
        overallBalken.id = 'overall-list-balken'; 
        overallBalken.dataset.subjectId = 'overall'; 

        if (expandedSubjectIds.has('overall')) {
            overallBalken.classList.add('expanded');
        }
        // (Rest der "Gesamt"-Liste unverändert)
        overallBalken.innerHTML = `
            <div class="balken-header">
                <span class="subject-name">Alle offenen Aufgaben</span>
                <button class="delete-subject-btn" title="Liste löschen">${DELETE_ICON}</button>
                <span class="task-counter">${sortedOverallTasks.length} offen</span>
                <button class="add-task-btn" title="Neue Aufgabe">+</button>
            </div>
        `;
        const overallTaskList = document.createElement('div');
        overallTaskList.className = 'task-list-collapsible';
        if (sortedOverallTasks.length > 0) {
            sortedOverallTasks.forEach(task => {
                const subject = subjects.find(s => s.id === task.subjectId);
                const subjectName = subject ? subject.name : 'Unbekannt';
                overallTaskList.appendChild(createTaskElement(task, subjectName));
            });
        } else {
            overallTaskList.innerHTML = '<p class="empty-task-list">Super! Keine Aufgaben mehr offen.</p>';
        }
        overallBalken.appendChild(overallTaskList);
        listView.appendChild(overallBalken);
        // --- Ende "Gesamt"-Liste ---


        // --- 2. Reguläre Fächer-Listen ---
        // (Nutzt jetzt die vorsortierte `subjects`-Liste von Feature 1)
        if (subjects.length === 0 && allIncompleteTasks.length === 0) {
            listView.innerHTML = '<p class="empty-state">Noch keine To-Do Liste. Füge oben rechts (+) eine Liste hinzu.</p>';
            return;
        }

        subjects.forEach(subject => { // Diese `subjects` sind bereits sortiert!
            const tasksForSubject = tasks.filter(t => t.subjectId === subject.id);
            const sortedTasks = sortTasks(tasksForSubject); // Tasks sortieren (Feature 2)
            
            const doneCount = tasksForSubject.filter(t => t.isDone).length;
            const totalCount = tasksForSubject.length;

            const balken = document.createElement('div');
            balken.className = 'subject-balken';
            balken.dataset.subjectId = subject.id;
            
            if (expandedSubjectIds.has(String(subject.id))) { 
                balken.classList.add('expanded');
            }

            // Lösch-Knopf
            balken.innerHTML = `
                <div class="balken-header">
                    <span class="subject-name">${subject.name}</span>
                    <button class="delete-subject-btn" title="Liste löschen">${DELETE_ICON}</button>
                    <span class="task-counter">${doneCount}/${totalCount}</span>
                    <button class="add-task-btn" title="Neue Aufgabe">+</button>
                </div>
            `;

            const taskList = document.createElement('div');
            taskList.className = 'task-list-collapsible';
            
            if (sortedTasks.length > 0) {
                sortedTasks.forEach(task => {
                    taskList.appendChild(createTaskElement(task, null)); 
                });
            } else {
                taskList.innerHTML = '<p class="empty-task-list">Du hast noch keine Aufgabe hinzugefügt.</p>';
            }

            balken.appendChild(taskList);
            listView.appendChild(balken);
        });
    }

    // GEÄNDERT: Nutzt sortierte `subjects`
    function renderColumnView(subjects, tasks) {
        columnView.innerHTML = '';

        if (subjects.length === 0) {
            return;
        }

        subjects.forEach(subject => { // Diese `subjects` sind bereits sortiert!
            const column = document.createElement('div');
            column.className = 'subject-column';
            column.dataset.subjectId = subject.id; 

            // Lösch-Knopf
            column.innerHTML = `
                <button class="delete-subject-btn" title="Liste löschen">${DELETE_ICON}</button>
                <h2>${subject.name}</h2>
                <div class="task-list">
                    </div>
                <button class="add-task-btn-column" title="Neue Aufgabe">+ Aufgabe hinzufügen</button>
            `;

            const taskList = column.querySelector('.task-list');
            const tasksForSubject = tasks.filter(t => t.subjectId === subject.id);
            const sortedTasks = sortTasks(tasksForSubject); // Tasks sortieren (Feature 2)

            if (sortedTasks.length > 0) {
                sortedTasks.forEach(task => {
                    taskList.appendChild(createTaskElement(task, null));
                });
            } else {
                taskList.innerHTML = '<p class="empty-task-list">Keine Aufgaben.</p>';
            }

            columnView.appendChild(column);
        });
    }


    // --- EVENT-LISTENER (BENUTZER-AKTIONEN) ---

    // GEÄNDERT: Fügt Listener für "Wichtig"-Buttons hinzu
    function setupEventListeners() {

        // --- Header-Buttons ---
        viewToggleBtn.addEventListener('click', () => {
            // ... (unverändert) ...
            if (currentView === 'list') {
                currentView = 'column';
                listView.classList.remove('active');
                columnView.classList.add('active');
                viewToggleBtn.innerHTML = COLUMN_VIEW_ICON;
                viewToggleBtn.title = "Spaltenansicht";
            } else {
                currentView = 'list';
                columnView.classList.remove('active');
                listView.classList.add('active');
                viewToggleBtn.innerHTML = LIST_VIEW_ICON;
                viewToggleBtn.title = "Listenansicht";
            }
        });

        addSubjectBtn.addEventListener('click', () => {
            showModal(addSubjectModal);
            subjectNameInput.focus(); 
        });

        // --- Modal-Aktionen ---
        cancelSubjectBtn.addEventListener('click', hideModals);
        cancelTaskBtn.addEventListener('click', hideModals);
        modalBackdrop.addEventListener('click', hideModals);
        cancelEditTaskBtn.addEventListener('click', hideModals); 
        cancelDeleteSubjectBtn.addEventListener('click', hideModals); 

        // NEU: "Wichtig"-Button Toggles
        addTaskPriorityToggle.addEventListener('click', () => {
            addTaskPriorityToggle.classList.toggle('active');
        });
        editTaskPriorityToggle.addEventListener('click', () => {
            editTaskPriorityToggle.classList.toggle('active');
        });


        // Modal "Neues Fach" SPEICHERN
        saveSubjectBtn.addEventListener('click', async () => {
            // ... (unverändert) ...
            const name = subjectNameInput.value.trim();
            if (name) {
                await addToDB('subjects', { name: name });
                hideModals();
                await loadAndRenderAll(); 
            } else {
                alert('Bitte einen Namen für die Liste eingeben.');
            }
        });

        // Modal "Neue Aufgabe" SPEICHERN
        saveTaskBtn.addEventListener('click', async () => {
            const description = taskDescInput.value.trim();
            const dueDate = taskDueDateInput.value;
            const subjectId = parseInt(taskSubjectIdInput.value); 
            // NEU: "Wichtig"-Status auslesen
            const isImportant = addTaskPriorityToggle.classList.contains('active');
            
            if (description && subjectId) {
                const newTask = { 
                    subjectId: subjectId, 
                    description: description, 
                    dueDate: dueDate || null, 
                    isDone: false,
                    isImportant: isImportant // NEU
                };
                await addToDB('tasks', newTask);
                hideModals();
                await loadAndRenderAll(); 
            } else {
                alert('Bitte eine Beschreibung eingeben.');
            }
        });
        
        // Modal "Aufgabe bearbeiten" SPEICHERN
        saveEditTaskBtn.addEventListener('click', async () => {
            const id = parseInt(editTaskIdInput.value);
            const description = editTaskDescInput.value.trim();
            const dueDate = editTaskDueDateInput.value;
            // NEU: "Wichtig"-Status auslesen
            const isImportant = editTaskPriorityToggle.classList.contains('active');

            if (!id || !description) return;
            try {
                const originalTask = await getFromDB('tasks', id);
                if (!originalTask) return;
                
                originalTask.description = description;
                originalTask.dueDate = dueDate || null;
                originalTask.isImportant = isImportant; // NEU
                
                await updateInDB('tasks', originalTask);
                hideModals();
                await loadAndRenderAll(); 
            } catch (error) {
                console.error('Fehler beim Speichern der Änderungen:', error);
            }
        });

        // Modal "Fach löschen" BESTÄTIGEN
        confirmDeleteSubjectBtn.addEventListener('click', async () => {
            const subjectId = parseInt(deleteSubjectIdInput.value);
            if (!subjectId) return;

            try {
                await deleteSubjectAndTasks(subjectId);
                hideModals();
                await loadAndRenderAll();
            } catch (error) {
                console.error('Fehler beim Löschen der Liste:', error);
                alert('Die Liste konnte nicht gelöscht werden.');
            }
        });


        // --- Event Delegation für dynamische Inhalte ---
        document.body.addEventListener('click', async (event) => {
            const target = event.target;

            // AKTION: Balken auf/zuklappen
            const balkenHeader = target.closest('.balken-header');
            if (balkenHeader) {
                // Verhindern, dass Klicks auf Knöpfe den Balken schalten
                if (!target.closest('button')) {
                    balkenHeader.parentElement.classList.toggle('expanded');
                }
            }
            
            // AKTION: "Neue Aufgabe" (im Balken)
            const addTaskBtnList = target.closest('.add-task-btn');
            if (addTaskBtnList) {
                const subjectId = parseInt(addTaskBtnList.closest('.subject-balken').dataset.subjectId);
                taskSubjectIdInput.value = subjectId; 
                showModal(addTaskModal);
                taskDescInput.focus();
            }
            
            // AKTION: "Neue Aufgabe" (in Spalte)
            const addTaskBtnColumn = target.closest('.add-task-btn-column');
            if (addTaskBtnColumn) {
                const subjectId = parseInt(addTaskBtnColumn.closest('.subject-column').dataset.subjectId);
                taskSubjectIdInput.value = subjectId; 
                showModal(addTaskModal);
                taskDescInput.focus();
            }

            // AKTION: Aufgabe löschen
            const deleteTaskBtn = target.closest('.delete-task-btn');
            if (deleteTaskBtn) {
                const taskId = parseInt(deleteTaskBtn.closest('.task-card').dataset.taskId);
                if (confirm('Möchtest du diese Aufgabe wirklich löschen?')) {
                    await deleteFromDB('tasks', taskId);
                    await loadAndRenderAll(); 
                }
            }
            
            // AKTION: Aufgabe bearbeiten (Klick auf .task-details)
            const taskDetails = target.closest('.task-details');
            if (taskDetails) {
                // Verhindern, dass Klick auf Checkbox das Modal öffnet
                // (Sollte nicht passieren, da Checkbox ausserhalb ist, aber sicher ist sicher)
                if (target.classList.contains('task-checkbox')) return; 

                const taskId = parseInt(taskDetails.closest('.task-card').dataset.taskId);
                await openEditTaskModal(taskId);
            }
            
            // AKTION: Fach löschen
            const deleteSubjectBtn = target.closest('.delete-subject-btn');
            if (deleteSubjectBtn) {
                let subjectId;
                const balken = deleteSubjectBtn.closest('.subject-balken');
                const column = deleteSubjectBtn.closest('.subject-column');
                
                if (balken) {
                    subjectId = balken.dataset.subjectId;
                } else if (column) {
                    subjectId = column.dataset.subjectId;
                }
                
                if (subjectId && subjectId !== 'overall') { // "Gesamt"-Liste kann nicht gelöscht werden
                    await openDeleteSubjectModal(parseInt(subjectId));
                }
            }
        });
        
        // Separater Listener für 'change' Events (Checkboxes)
        document.body.addEventListener('change', async (event) => {
            // ... (unverändert) ...
            const target = event.target;
            if (target.classList.contains('task-checkbox')) {
                const taskId = parseInt(target.closest('.task-card').dataset.taskId);
                const isDone = target.checked;
                const taskToUpdate = await getFromDB('tasks', taskId);
                if (taskToUpdate) {
                    taskToUpdate.isDone = isDone;
                    await updateInDB('tasks', taskToUpdate);
                    await loadAndRenderAll();
                }
            }
        });
    }

    // --- INITIALISIERUNG ---
    initDatabase();
    setupEventListeners();
    requestPersistentStorage(); // Aufruf hinzugefügt (war vorher nicht aufgerufen)

});