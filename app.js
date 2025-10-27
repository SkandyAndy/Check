document.addEventListener('DOMContentLoaded', () => {

    // --- VARIABLEN & DOM-ELEMENTE ---

    const APP_VERSION = '1.4';
    let db;
    let currentView = 'list';
    let lastActiveView = 'list'; // NEU: Für Einstellungs-Navigation

    // Header
    const viewToggleBtn = document.getElementById('view-toggle-btn');
    const addSubjectBtn = document.getElementById('add-subject-btn');
    const settingsBtn = document.getElementById('settings-btn'); // NEU

    // Ansichten
    const listView = document.getElementById('list-view');
    const columnView = document.getElementById('column-view');
    const settingsView = document.getElementById('settings-view'); // NEU
    
    // NEU: Einstellungs-Seite Elemente
    const settingsBackBtn = document.getElementById('settings-back-btn');
    const exportDataBtn = document.getElementById('export-data-btn');
    const importDataBtn = document.getElementById('import-data-btn');
    const importFileInput = document.getElementById('import-file-input');
    const appVersionDisplay = document.getElementById('app-version-display');

    // NEU: Backup-Erinnerung
    const backupReminder = document.getElementById('backup-reminder');
    const backupReminderBtn = document.getElementById('backup-reminder-btn');
    const backupReminderCloseBtn = document.getElementById('backup-reminder-close-btn');

    // Modals
    const modalBackdrop = document.getElementById('modal-backdrop');
    // ... (alle Modal-Variablen bleiben gleich) ...
    const addSubjectModal = document.getElementById('add-subject-modal');
    const addTaskModal = document.getElementById('add-task-modal');
    const editTaskModal = document.getElementById('edit-task-modal');
    const deleteSubjectModal = document.getElementById('delete-subject-modal'); 

    // ... (alle Modal-Feld-Variablen bleiben gleich) ...
    const subjectNameInput = document.getElementById('subject-name-input');
    const saveSubjectBtn = document.getElementById('save-add-subject');
    const cancelSubjectBtn = document.getElementById('cancel-add-subject');
    const taskSubjectIdInput = document.getElementById('task-subject-id-input');
    const taskDescInput = document.getElementById('task-desc-input');
    const taskDueDateInput = document.getElementById('task-due-date-input');
    const addTaskPriorityToggle = document.getElementById('add-task-priority-toggle'); 
    const saveTaskBtn = document.getElementById('save-add-task');
    const cancelTaskBtn = document.getElementById('cancel-add-task');
    const editTaskIdInput = document.getElementById('edit-task-id-input');
    const editTaskDescInput = document.getElementById('edit-task-desc-input');
    const editTaskDueDateInput = document.getElementById('edit-task-due-date-input');
    const editTaskPriorityToggle = document.getElementById('edit-task-priority-toggle'); 
    const saveEditTaskBtn = document.getElementById('save-edit-task');
    const cancelEditTaskBtn = document.getElementById('cancel-edit-task');
    const deleteSubjectIdInput = document.getElementById('delete-subject-id-input');
    const deleteSubjectName = document.getElementById('delete-subject-name');
    const cancelDeleteSubjectBtn = document.getElementById('cancel-delete-subject');
    const confirmDeleteSubjectBtn = document.getElementById('confirm-delete-subject');

    // ... (Icons bleiben gleich) ...
    const LIST_VIEW_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24"><path d="M440 856V616H200v240h240Zm320 0V616H520v240h240ZM200 536V296h240v240H200Zm320 0V296h240v240H520Z"/></svg>`;
    const COLUMN_VIEW_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24"><path d="M200 856V296h120v560H200Zm240 0V296h120v560H440Zm240 0V296h120v560H680Z"/></svg>`;
    const DELETE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24"><path d="M280 936q-33 0-56.5-23.5T200 856V336h-40v-80h200v-40h320v40h200v80h-40v520q0 33-23.5 56.5T680 936H280Zm400-600H280v520h400V336ZM360 776h80V416h-80v360Zm160 0h80V416h-80v360ZM280 336v520-520Z"/></svg>`;
    const PRIORITY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24"><path d="M480 976q-33 0-56.5-23.5T400 896q0-33 23.5-56.5T480 816q33 0 56.5 23.5T560 896q0 33-23.5 56.5T480 976Zm-40-200v-480h80v480h-80Z"/></svg>`;

    // --- SPEICHER-PERSISTENZ ---
    // ... (requestPersistentStorage Funktion bleibt unverändert) ...
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
        const request = indexedDB.open('SchoolAppDB', 1);

        request.onerror = (event) => {
            console.error('Datenbank-Fehler:', event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Datenbank erfolgreich geöffnet.');
            loadAndRenderAll();
            checkBackupReminder(); // NEU: Backup-Erinnerung prüfen
        };

        request.onupgradeneeded = (event) => {
            // (unverändert)
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

    // ... (Alle DB-Helper: getFromDB, getAllFromDB, addToDB, updateInDB, deleteFromDB, deleteSubjectAndTasks bleiben unverändert) ...
    function getFromDB(storeName, id) {
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
         return new Promise((resolve, reject) => {
            if (!db) return reject("DB nicht initialisiert");
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }

    function deleteSubjectAndTasks(subjectId) {
        return new Promise(async (resolve, reject) => {
            if (!db) return reject("DB nicht initialisiert");
            try {
                const allTasks = await getAllFromDB('tasks');
                const tasksToDelete = allTasks.filter(t => t.subjectId === subjectId);
                const transaction = db.transaction(['subjects', 'tasks'], 'readwrite');
                const subjectStore = transaction.objectStore('subjects');
                const taskStore = transaction.objectStore('tasks');
                transaction.onerror = (e) => reject(e.target.error);
                transaction.oncomplete = () => {
                    console.log('Liste und Tasks gelöscht');
                    resolve();
                };
                tasksToDelete.forEach(task => taskStore.delete(task.id));
                subjectStore.delete(subjectId);
            } catch (error) {
                reject(error);
            }
        });
    }

    // --- MODAL (POP-UP) STEUERUNG ---
    // ... (showModal, hideModals, openEditTaskModal, openDeleteSubjectModal bleiben unverändert) ...
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
        subjectNameInput.value = '';
        taskDescInput.value = '';
        taskDueDateInput.value = '';
        taskSubjectIdInput.value = '';
        editTaskIdInput.value = '';
        editTaskDescInput.value = '';
        editTaskDueDateInput.value = '';
        addTaskPriorityToggle.classList.remove('active');
        editTaskPriorityToggle.classList.remove('active');
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

    async function openDeleteSubjectModal(subjectId) {
        try {
            const subject = await getFromDB('subjects', subjectId);
            if (!subject) return;
            deleteSubjectIdInput.value = subject.id;
            deleteSubjectName.textContent = subject.name;
            showModal(deleteSubjectModal);
        } catch (error) {
            console.error('Fehler beim Öffnen des Lösch-Modals:', error);
        }
    }

    // --- RENDER-FUNKTIONEN (ZEICHNEN DER UI) ---
    // ... (sortTasks, sortSubjects, loadAndRenderAll, createTaskElement, renderListView, renderColumnView bleiben unverändert) ...
    function sortTasks(taskArray) {
        return taskArray.sort((a, b) => {
            if (a.isDone !== b.isDone) {
                return a.isDone ? 1 : -1;
            }
            const aImportant = a.isImportant || false;
            const bImportant = b.isImportant || false;
            if (aImportant !== bImportant) {
                return aImportant ? -1 : 1;
            }
            if (a.dueDate && !b.dueDate) return -1;
            if (!a.dueDate && b.dueDate) return 1;
            if (!a.dueDate && !b.dueDate) return 0;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });
    }

    function sortSubjects(subjectArray, allTasks) {
        const subjectsWithStatus = subjectArray.map(subject => {
            const tasksForSubject = allTasks.filter(t => t.subjectId === subject.id);
            const hasTasks = tasksForSubject.length > 0;
            const hasOpenTasks = tasksForSubject.some(t => !t.isDone);
            let sortGroup;
            if (hasOpenTasks) {
                sortGroup = 1; 
            } else if (hasTasks) {
                sortGroup = 2; 
            } else {
                sortGroup = 3;
            }
            return { ...subject, sortGroup };
        });
        return subjectsWithStatus.sort((a, b) => {
            if (a.sortGroup !== b.sortGroup) {
                return a.sortGroup - b.sortGroup;
            }
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
            const sortedSubjects = sortSubjects(subjects, tasks);
            renderListView(sortedSubjects, tasks, expandedSubjectIds);
            renderColumnView(sortedSubjects, tasks);
        } catch (error) {
            console.error('Fehler beim Laden und Rendern:', error);
        }
    }

    function createTaskElement(task, subjectName = null) {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card';
        taskCard.dataset.taskId = task.id;
        if (task.isDone) {
            taskCard.classList.add('is-done');
        }
        if (task.isImportant) {
            taskCard.classList.add('is-important');
        }
        let subjectNameHtml = '';
        if (subjectName) {
            subjectNameHtml = `<div class="task-subject-name">${subjectName}</div>`;
        }
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
                    ${priorityIconHtml}
                    <span>${task.description}</span>
                </div>
                ${dueDateHtml}
            </div>
            <button class="delete-task-btn" title="Aufgabe löschen">X</button>
        `;
        return taskCard;
    }

    function renderListView(subjects, tasks, expandedSubjectIds = new Set()) {
        listView.innerHTML = '';
        const allIncompleteTasks = tasks.filter(t => !t.isDone);
        const sortedOverallTasks = sortTasks(allIncompleteTasks); 
        const overallBalken = document.createElement('div');
        overallBalken.className = 'subject-balken';
        overallBalken.id = 'overall-list-balken'; 
        overallBalken.dataset.subjectId = 'overall'; 
        if (expandedSubjectIds.has('overall')) {
            overallBalken.classList.add('expanded');
        }
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
        if (subjects.length === 0 && allIncompleteTasks.length === 0) {
            listView.innerHTML = '<p class="empty-state">Noch keine To-Do Liste. Füge oben rechts (+) eine Liste hinzu.</p>';
            return;
        }
        subjects.forEach(subject => {
            const tasksForSubject = tasks.filter(t => t.subjectId === subject.id);
            const sortedTasks = sortTasks(tasksForSubject);
            const doneCount = tasksForSubject.filter(t => t.isDone).length;
            const totalCount = tasksForSubject.length;
            const balken = document.createElement('div');
            balken.className = 'subject-balken';
            balken.dataset.subjectId = subject.id;
            if (expandedSubjectIds.has(String(subject.id))) { 
                balken.classList.add('expanded');
            }
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

    function renderColumnView(subjects, tasks) {
        columnView.innerHTML = '';
        if (subjects.length === 0) {
            return;
        }
        subjects.forEach(subject => {
            const column = document.createElement('div');
            column.className = 'subject-column';
            column.dataset.subjectId = subject.id; 
            column.innerHTML = `
                <button class="delete-subject-btn" title="Liste löschen">${DELETE_ICON}</button>
                <h2>${subject.name}</h2>
                <div class="task-list">
                    </div>
                <button class="add-task-btn-column" title="Neue Aufgabe">+ Aufgabe hinzufügen</button>
            `;
            const taskList = column.querySelector('.task-list');
            const tasksForSubject = tasks.filter(t => t.subjectId === subject.id);
            const sortedTasks = sortTasks(tasksForSubject);
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

    
    // --- NEU: IMPORT / EXPORT FUNKTIONEN ---

    /**
     * Löst den Download aller Daten als JSON-Datei aus.
     */
    async function handleExport() {
        console.log('Export wird gestartet...');
        try {
            const subjects = await getAllFromDB('subjects');
            const tasks = await getAllFromDB('tasks');
            
            const backupData = {
                appName: 'CheckPWA',
                backupVersion: 1.0,
                timestamp: new Date().toISOString(),
                subjects,
                tasks
            };

            const jsonString = JSON.stringify(backupData, null, 2); // Formatiert für Lesbarkeit
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `check_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('Export erfolgreich.');
            
            // Zeitstempel für Erinnerung speichern
            localStorage.setItem('lastExportTimestamp', Date.now().toString());
            hideBackupReminder();

        } catch (error) {
            console.error('Export fehlgeschlagen:', error);
            alert('Daten-Export konnte nicht durchgeführt werden.');
        }
    }

    /**
     * Wird aufgerufen, wenn eine Import-Datei ausgewählt wurde.
     */
    async function handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        console.log('Import wird gestartet...');
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (!importedData || importedData.appName !== 'CheckPWA') {
                    throw new Error('Dies ist keine valide "Check"-Backup-Datei.');
                }

                if (confirm('Möchtest du die Daten wirklich importieren? Bestehende Daten werden zusammengeführt.')) {
                    await mergeData(importedData);
                    alert('Import erfolgreich abgeschlossen! Die Ansicht wird neu geladen.');
                    await loadAndRenderAll();
                }

            } catch (error) {
                console.error('Import fehlgeschlagen:', error);
                alert('Import fehlgeschlagen: ' + error.message);
            } finally {
                // Input zurücksetzen, damit dieselbe Datei erneut ausgewählt werden kann
                event.target.value = null;
            }
        };
        
        reader.onerror = () => {
            alert('Fehler beim Lesen der Datei.');
        };

        reader.readAsText(file);
    }

    /**
     * Führt importierte Daten mit bestehenden DB-Daten zusammen.
     * Verhindert Duplikate basierend auf Namen (Listen) und "Signaturen" (Aufgaben).
     */
    async function mergeData(importedData) {
        const subjectsToImport = importedData.subjects || [];
        const tasksToImport = importedData.tasks || [];
        
        const currentSubjects = await getAllFromDB('subjects');
        const currentTasks = await getAllFromDB('tasks');

        // 1. Map für existierende Listennamen -> ID
        const subjectNameMap = new Map(currentSubjects.map(s => [s.name.toLowerCase(), s.id]));
        
        // 2. Map für "alte" Import-ID -> "neue" DB-ID (wichtig für Task-Zuweisung)
        const oldIdToNewIdMap = new Map();

        // Schritt A: Listen (Subjects) mergen
        console.log('Listen werden zusammengeführt...');
        for (const subject of subjectsToImport) {
            const existingId = subjectNameMap.get(subject.name.toLowerCase());
            
            if (existingId) {
                // Liste existiert bereits, wir merken uns die ID
                oldIdToNewIdMap.set(subject.id, existingId);
            } else {
                // Liste ist neu, wir fügen sie hinzu
                const newSubjectId = await addToDB('subjects', { name: subject.name });
                oldIdToNewIdMap.set(subject.id, newSubjectId);
                console.log(`Neue Liste erstellt: ${subject.name} (ID: ${newSubjectId})`);
            }
        }

        // Schritt B: Aufgaben (Tasks) mergen
        console.log('Aufgaben werden zusammengeführt...');

        // Set für existierende Task-"Signaturen" (zum Abgleich von Duplikaten)
        // Signatur = "ListenID-Beschreibung-Fälligkeitsdatum"
        const taskSignatureMap = new Set(
            currentTasks.map(t => `${t.subjectId}-${t.description.trim()}-${t.dueDate || null}`)
        );

        for (const task of tasksToImport) {
            // Finde die korrekte (neue oder existierende) Listen-ID
            const newSubjectId = oldIdToNewIdMap.get(task.subjectId);

            if (!newSubjectId) {
                console.warn(`Überspringe Task, da zugehörige Liste nicht gefunden wurde: ${task.description}`);
                continue;
            }
            
            const taskSignature = `${newSubjectId}-${task.description.trim()}-${task.dueDate || null}`;
            
            if (taskSignatureMap.has(taskSignature)) {
                // Task existiert bereits (Duplikat)
                console.log(`Überspringe Duplikat-Task: ${task.description}`);
            } else {
                // Task ist neu, wir fügen ihn hinzu
                const newTask = {
                    subjectId: newSubjectId,
                    description: task.description,
                    dueDate: task.dueDate || null,
                    isDone: task.isDone || false,
                    isImportant: task.isImportant || false
                };
                // (Wichtig: Wir verwenden *nicht* die `task.id` aus dem Import)
                await addToDB('tasks', newTask);
            }
        }
        console.log('Zusammenführung abgeschlossen.');
    }

    // --- NEU: BACKUP-ERINNERUNG ---

    function checkBackupReminder() {
        const lastExport = localStorage.getItem('lastExportTimestamp');
        const EINE_WOCHE_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage
        
        if (!lastExport || (Date.now() - parseInt(lastExport)) > EINE_WOCHE_MS) {
            // Zeige Banner, wenn kein Backup oder älter als 1 Woche
            backupReminder.style.display = 'flex';
            // Passe evtl. den Sticky-Header der Einstellungsseite an
            document.querySelector('.settings-header').style.top = '108px'; // 60px Header + ca. 48px Banner
        }
    }

    function hideBackupReminder() {
        backupReminder.style.display = 'none';
        document.querySelector('.settings-header').style.top = '60px'; // Standard-Position
    }


    // --- EVENT-LISTENER (BENUTZER-AKTIONEN) ---

    function setupEventListeners() {

        // App-Version in den Einstellungen setzen
        if (appVersionDisplay) {
            appVersionDisplay.textContent = APP_VERSION;
        }

        // --- Header-Buttons ---
        viewToggleBtn.addEventListener('click', () => {
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

        // NEU: Einstellungs-Navigation
        settingsBtn.addEventListener('click', () => {
            lastActiveView = currentView; // Aktuelle Ansicht merken
            listView.classList.remove('active');
            columnView.classList.remove('active');
            settingsView.classList.add('active');
        });

        settingsBackBtn.addEventListener('click', () => {
            settingsView.classList.remove('active');
            // Zurück zur vorherigen Ansicht
            if (lastActiveView === 'list') {
                listView.classList.add('active');
            } else {
                columnView.classList.add('active');
            }
        });

        // NEU: Import/Export Listener
        exportDataBtn.addEventListener('click', handleExport);
        importDataBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', handleImport);

        // NEU: Backup-Banner Listener
        backupReminderCloseBtn.addEventListener('click', hideBackupReminder);
        backupReminderBtn.addEventListener('click', () => {
            hideBackupReminder();
            settingsBtn.click(); // Öffnet die Einstellungsseite
        });

        // --- Modal-Aktionen ---
        // (Alle Listener für Modals, Speichern, Abbrechen, "Wichtig"-Toggle bleiben unverändert) ...
        cancelSubjectBtn.addEventListener('click', hideModals);
        cancelTaskBtn.addEventListener('click', hideModals);
        modalBackdrop.addEventListener('click', hideModals);
        cancelEditTaskBtn.addEventListener('click', hideModals); 
        cancelDeleteSubjectBtn.addEventListener('click', hideModals); 
        addTaskPriorityToggle.addEventListener('click', () => addTaskPriorityToggle.classList.toggle('active'));
        editTaskPriorityToggle.addEventListener('click', () => editTaskPriorityToggle.classList.toggle('active'));

        saveSubjectBtn.addEventListener('click', async () => {
            const name = subjectNameInput.value.trim();
            if (name) {
                await addToDB('subjects', { name: name });
                hideModals();
                await loadAndRenderAll(); 
            } else {
                alert('Bitte einen Namen für die Liste eingeben.');
            }
        });

        saveTaskBtn.addEventListener('click', async () => {
            const description = taskDescInput.value.trim();
            const dueDate = taskDueDateInput.value;
            const subjectId = parseInt(taskSubjectIdInput.value); 
            const isImportant = addTaskPriorityToggle.classList.contains('active');
            if (description && subjectId) {
                const newTask = { subjectId, description, dueDate: dueDate || null, isDone: false, isImportant };
                await addToDB('tasks', newTask);
                hideModals();
                await loadAndRenderAll(); 
            } else {
                alert('Bitte eine Beschreibung eingeben.');
            }
        });
        
        saveEditTaskBtn.addEventListener('click', async () => {
            const id = parseInt(editTaskIdInput.value);
            const description = editTaskDescInput.value.trim();
            const dueDate = editTaskDueDateInput.value;
            const isImportant = editTaskPriorityToggle.classList.contains('active');
            if (!id || !description) return;
            try {
                const originalTask = await getFromDB('tasks', id);
                if (!originalTask) return;
                originalTask.description = description;
                originalTask.dueDate = dueDate || null;
                originalTask.isImportant = isImportant;
                await updateInDB('tasks', originalTask);
                hideModals();
                await loadAndRenderAll(); 
            } catch (error) {
                console.error('Fehler beim Speichern der Änderungen:', error);
            }
        });

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
        // (Unverändert)
        document.body.addEventListener('click', async (event) => {
            const target = event.target;
            const balkenHeader = target.closest('.balken-header');
            if (balkenHeader && !target.closest('button')) {
                balkenHeader.parentElement.classList.toggle('expanded');
            }
            const addTaskBtnList = target.closest('.add-task-btn');
            if (addTaskBtnList) {
                const subjectId = parseInt(addTaskBtnList.closest('.subject-balken').dataset.subjectId);
                taskSubjectIdInput.value = subjectId; 
                showModal(addTaskModal);
                taskDescInput.focus();
            }
            const addTaskBtnColumn = target.closest('.add-task-btn-column');
            if (addTaskBtnColumn) {
                const subjectId = parseInt(addTaskBtnColumn.closest('.subject-column').dataset.subjectId);
                taskSubjectIdInput.value = subjectId; 
                showModal(addTaskModal);
                taskDescInput.focus();
            }
            const deleteTaskBtn = target.closest('.delete-task-btn');
            if (deleteTaskBtn) {
                const taskId = parseInt(deleteTaskBtn.closest('.task-card').dataset.taskId);
                if (confirm('Möchtest du diese Aufgabe wirklich löschen?')) {
                    await deleteFromDB('tasks', taskId);
                    await loadAndRenderAll(); 
                }
            }
            const taskDetails = target.closest('.task-details');
            if (taskDetails && !target.classList.contains('task-checkbox')) {
                const taskId = parseInt(taskDetails.closest('.task-card').dataset.taskId);
                await openEditTaskModal(taskId);
            }
            const deleteSubjectBtn = target.closest('.delete-subject-btn');
            if (deleteSubjectBtn) {
                let subjectId;
                const balken = deleteSubjectBtn.closest('.subject-balken');
                const column = deleteSubjectBtn.closest('.subject-column');
                if (balken) subjectId = balken.dataset.subjectId;
                else if (column) subjectId = column.dataset.subjectId;
                
                if (subjectId && subjectId !== 'overall') {
                    await openDeleteSubjectModal(parseInt(subjectId));
                }
            }
        });
        
        // Separater Listener für 'change' Events (Checkboxes)
        // (Unverändert)
        document.body.addEventListener('change', async (event) => {
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
    requestPersistentStorage();

});