// ===================================================================================
// CHECK - EINE EINFACHE TO-DO LISTEN PWA
// Haupt-Skript für die Anwendungslogik
// ===================================================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. GLOBALE VARIABLEN & DOM-ELEMENTE ---

    const APP_VERSION = '1.5.2';
    let db;
    let currentView = 'list';
    let lastActiveView = 'list';
    
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Header-Elemente
    const refreshBtn = document.getElementById('refresh-btn');
    const viewToggleBtn = document.getElementById('view-toggle-btn');
    const addSubjectBtn = document.getElementById('add-subject-btn');
    const settingsBtn = document.getElementById('settings-btn'); 

    // Ansichten
    const listView = document.getElementById('list-view');
    const columnView = document.getElementById('column-view');
    const settingsView = document.getElementById('settings-view'); 
    
    // Elemente der Einstellungs-Seite
    const settingsBackBtn = document.getElementById('settings-back-btn');
    const exportDataBtn = document.getElementById('export-data-btn');
    const importDataBtn = document.getElementById('import-data-btn');
    const importFileInput = document.getElementById('import-file-input');
    const appVersionDisplay = document.getElementById('app-version-display');

    // Backup-Erinnerung
    const backupReminder = document.getElementById('backup-reminder');
    const backupReminderBtn = document.getElementById('backup-reminder-btn');
    const backupReminderCloseBtn = document.getElementById('backup-reminder-close-btn');

    // Modals
    const modalBackdrop = document.getElementById('modal-backdrop');
    const addSubjectModal = document.getElementById('add-subject-modal');
    const addTaskModal = document.getElementById('add-task-modal');
    const editTaskModal = document.getElementById('edit-task-modal');
    const deleteSubjectModal = document.getElementById('delete-subject-modal'); 

    // Felder "Neues Fach"
    const subjectNameInput = document.getElementById('subject-name-input'); // Eingabefeld für den Listennamen
    const saveSubjectBtn = document.getElementById('save-add-subject');
    const cancelSubjectBtn = document.getElementById('cancel-add-subject');

    // Felder "Neue Aufgabe"
    const taskSubjectIdInput = document.getElementById('task-subject-id-input');
    const addTaskTitleInput = document.getElementById('add-task-title-input');
    const addTaskNotesInput = document.getElementById('add-task-notes-input');
    const addTaskDueDateInput = document.getElementById('add-task-due-date-input');
    const addTaskDueTimeInput = document.getElementById('add-task-due-time-input');
    const addTaskPriorityToggle = document.getElementById('add-task-priority-toggle');
    const addChecklistItemInput = document.getElementById('add-checklist-item-input');
    const addChecklistItemBtn = document.getElementById('add-checklist-item-btn');
    const addChecklistItemsList = document.getElementById('add-checklist-items-list');
    const saveTaskBtn = document.getElementById('save-add-task');
    const cancelTaskBtn = document.getElementById('cancel-add-task');

    // Felder "Aufgabe bearbeiten"
    const editTaskIdInput = document.getElementById('edit-task-id-input');
    const editTaskTitleInput = document.getElementById('edit-task-title-input');
    const editTaskNotesInput = document.getElementById('edit-task-notes-input');
    const editTaskDueDateInput = document.getElementById('edit-task-due-date-input');
    const editTaskDueTimeInput = document.getElementById('edit-task-due-time-input');
    const editTaskPriorityToggle = document.getElementById('edit-task-priority-toggle');
    const editChecklistItemInput = document.getElementById('edit-checklist-item-input');
    const editChecklistItemBtn = document.getElementById('edit-checklist-item-btn');
    const editChecklistItemsList = document.getElementById('edit-checklist-items-list');
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
    const DELETE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24"><path d="M280 936q-33 0-56.5-23.5T200 856V336h-40v-80h200v-40h320v40h200v80h-40v520q0 33-23.5 56.5T680 936H280Zm400-600H280v520h400V336ZM360 776h80V416h-80v360Zm160 0h80V416h-80v360ZM280 336v520-520Z"/></svg>`;
    const PRIORITY_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24"><path d="M480 976q-33 0-56.5-23.5T400 896q0-33 23.5-56.5T480 816q33 0 56.5 23.5T560 896q0 33-23.5 56.5T480 976Zm-40-200v-480h80v480h-80Z"/></svg>`;
    const EDIT_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 96 960 960" width="20"><path d="M200 856h56l345-345-56-56-345 345v56Zm572-403L602 283l56-56q23-23 56.5-23t56.5 23l56 56q23 23 23 56.5T845 399l-73 73Z"/></svg>`;

    // --- 2. PERSISTENTER SPEICHER ---
    /**
     * Versucht, den Speicher der App als "persistent" zu markieren.
     * Dies verhindert, dass der Browser die Daten (IndexedDB) bei geringem Speicherplatz automatisch löscht.
     */
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

    // --- 3. DATENBANK (INDEXEDDB) ---

    /**
     * Initialisiert die IndexedDB-Datenbank.
     * Erstellt die Object Stores 'subjects' (Listen) und 'tasks' (Aufgaben), falls sie nicht existieren.
     */
    function initDatabase() {
        const request = indexedDB.open('SchoolAppDB', 1);
        request.onerror = (event) => console.error('Datenbank-Fehler:', event.target.error);
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Datenbank erfolgreich geöffnet.');
            loadAndRenderAll();
            checkBackupReminder();
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

    // --- Datenbank-Hilfsfunktionen (CRUD-Operationen) ---
    /**
     * Holt einen einzelnen Eintrag aus einem Store anhand seiner ID.
     * @param {string} storeName - Der Name des Object Stores.
     * @param {number} id - Die ID des Eintrags.
     */
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

    /**
     * Holt alle Einträge aus einem Store.
     * @param {string} storeName - Der Name des Object Stores.
     */
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

    /**
     * Fügt einen neuen Eintrag zu einem Store hinzu.
     * @param {string} storeName - Der Name des Object Stores.
     * @param {object} data - Das hinzuzufügende Objekt.
     */
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

    /**
     * Aktualisiert einen bestehenden Eintrag in einem Store.
     * @param {string} storeName - Der Name des Object Stores.
     * @param {object} data - Das zu aktualisierende Objekt (muss eine 'id' Eigenschaft haben).
     */
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

    /**
     * Löscht einen Eintrag aus einem Store anhand seiner ID.
     * @param {string} storeName - Der Name des Object Stores.
     * @param {number} id - Die ID des zu löschenden Eintrags.
     */
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

    /**
     * Löscht eine Liste (subject) und alle zugehörigen Aufgaben (tasks).
     * @param {number} subjectId - Die ID der zu löschenden Liste.
     */
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

    // --- 4. MODAL-STEUERUNG ---

    // Lokaler State für die Checkliste, die gerade im Modal bearbeitet wird.
    // Dies ist nötig, damit Hinzufügen/Löschen von Unterpunkten funktioniert,
    // bevor die Aufgabe final gespeichert wird.
    let modalChecklistState = [];

    /**
     * Zeigt ein bestimmtes Modal und den Hintergrund-Overlay an.
     * @param {HTMLElement} modalElement - Das anzuzeigende Modal-Element.
     */
    function showModal(modalElement) {
        modalChecklistState = []; // State hier zurücksetzen, BEVOR er evtl. neu befüllt wird.
        modalBackdrop.classList.add('active');
        modalElement.classList.add('active');
        modalChecklistState = [];
    }

    /**
     * Versteckt alle Modals und setzt die Eingabefelder zurück.
     */
    function hideModals() {
        modalBackdrop.classList.remove('active');
        addSubjectModal.classList.remove('active');
        addTaskModal.classList.remove('active');
        editTaskModal.classList.remove('active');
        deleteSubjectModal.classList.remove('active');

        // Felder im "Neue Aufgabe"-Modal zurücksetzen
        taskSubjectIdInput.value = '';
        addTaskTitleInput.value = '';
        addTaskNotesInput.value = '';
        addTaskDueDateInput.value = '';
        addTaskDueTimeInput.value = '';
        addTaskPriorityToggle.classList.remove('active');
        addChecklistItemInput.value = '';
        addChecklistItemsList.innerHTML = '';

        // Felder im "Aufgabe bearbeiten"-Modal zurücksetzen
        editTaskIdInput.value = '';
        editTaskTitleInput.value = '';
        editTaskNotesInput.value = '';
        editTaskDueDateInput.value = '';
        editTaskDueTimeInput.value = '';
        editTaskPriorityToggle.classList.remove('active');
        editChecklistItemInput.value = '';
        editChecklistItemsList.innerHTML = ''; // Wichtig: Liste leeren

        // Lösch-Modal-Felder
        deleteSubjectIdInput.value = '';
        deleteSubjectName.textContent = '';

        // Checklisten-State leeren
        modalChecklistState = [];
        }

    // --- 5. CHECKLISTEN-EDITOR LOGIK (IM MODAL) ---

    /**
     * Rendert die Checklisten-Punkte aus `modalChecklistState` in der UI.
     * @param {HTMLUListElement} listElement - Das <ul>-Element, in das gerendert werden soll.
     */
    function renderModalChecklist(listElement) {
        listElement.innerHTML = ''; // Liste leeren
        modalChecklistState.forEach(item => {
            const li = document.createElement('li');
            li.dataset.itemId = item.id;
            li.innerHTML = `
                <input type="checkbox" disabled ${item.isDone ? 'checked' : ''}>
                <span>${item.text}</span>
                <button type="button" class="delete-item-btn" title="Punkt löschen">X</button>
            `;
            listElement.appendChild(li);
        });
    }

    /**
     * Fügt einen neuen Punkt zur `modalChecklistState` hinzu und rendert die Liste neu.
     * @param {HTMLInputElement} inputElement - Das Eingabefeld für den neuen Punkt.
     * @param {HTMLUListElement} listElement - Das <ul>-Element zum Neu-Rendern.
     */
    function handleAddChecklistItem(inputElement, listElement) {
        const text = inputElement.value.trim();
        if (text) {
            modalChecklistState.push({
                id: generateUUID(),
                text: text,
                isDone: false
            });
            inputElement.value = '';
            renderModalChecklist(listElement);
        }
    }

    /**
     * Entfernt einen Punkt aus der `modalChecklistState` und rendert die Liste neu.
     * @param {Event} event - Das Klick-Event.
     * @param {HTMLUListElement} listElement - Das <ul>-Element zum Neu-Rendern.
     */
    function handleDeleteChecklistItem(event, listElement) {
        const deleteBtn = event.target.closest('.delete-item-btn');
        if (deleteBtn) {
            const itemId = deleteBtn.parentElement.dataset.itemId;
            modalChecklistState = modalChecklistState.filter(item => item.id !== itemId);
            renderModalChecklist(listElement);
        }
    }

    /**
     * Öffnet das "Aufgabe bearbeiten"-Modal und füllt es mit den Daten der ausgewählten Aufgabe.
     * @param {number} taskId - Die ID der zu bearbeitenden Aufgabe.
     */
    async function openEditTaskModal(taskId) {
        try {
            const task = await getFromDB('tasks', taskId);
            if (!task) return;

            editTaskIdInput.value = task.id;
            editTaskTitleInput.value = task.title || task.description || ''; // `description` für Abwärtskompatibilität
            editTaskNotesInput.value = task.notes || '';
            editTaskDueDateInput.value = task.dueDate || '';
            editTaskDueTimeInput.value = task.dueTime || '';

            // Setzt den "Wichtig"-Button basierend auf dem Task-Status
            editTaskPriorityToggle.classList.toggle('active', !!task.isImportant);

            // Checkliste laden
            // Eine Kopie erstellen, damit das Original nicht direkt verändert wird
            modalChecklistState = [...(task.checklist || [])];
            renderModalChecklist(editChecklistItemsList);

            showModal(editTaskModal);
            
            // Modal anzeigen, NACHDEM der State befüllt wurde.
            editTaskModal.classList.add('active');
            modalBackdrop.classList.add('active');
            editTaskTitleInput.focus();
        } catch (error) {
            console.error('Fehler beim Öffnen des Edit-Modals:', error);
        }
    }

    /**
     * Öffnet das "Liste löschen"-Bestätigungsmodal.
     * @param {number} subjectId - Die ID der zu löschenden Liste.
     */
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

    // --- 6. RENDER-FUNKTIONEN (UI ZEICHNEN) ---

    /**
     * Sortiert ein Array von Aufgaben nach den folgenden Kriterien:
     * 1. Erledigte Aufgaben nach unten. 2. Wichtige Aufgaben nach oben. 3. Nach Fälligkeitsdatum und -uhrzeit.
     */
    function sortTasks(taskArray) {
        return taskArray.sort((a, b) => {
            // 1. Erledigte nach unten
            if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;

            // 2. Wichtige nach oben (nur bei offenen Tasks)
            const aImportant = a.isImportant || false;
            const bImportant = b.isImportant || false;
            if (aImportant !== bImportant) return aImportant ? -1 : 1;

            // 3. Nach Datum (und Uhrzeit)
            const aDate = a.dueDate;
            const bDate = b.dueDate;
            const aTime = a.dueTime || '00:00'; // Standardzeit für Sortierung
            const bTime = b.dueTime || '00:00';

            if (aDate && !bDate) return -1;
            if (!aDate && bDate) return 1;

            if (aDate && bDate) {
                if (aDate !== bDate) {
                    return new Date(aDate) - new Date(bDate); // Ältestes Datum zuerst
                }
                // Daten sind gleich, prüfe Uhrzeit
                return aTime.localeCompare(bTime); // Früheste Uhrzeit zuerst
            }
            return 0; // Beide haben kein Datum
        });
    }

    /**
     * Sortiert ein Array von Listen (subjects) nach den folgenden Kriterien:
     * 1. Listen mit offenen Aufgaben. 2. Listen mit nur erledigten Aufgaben. 3. Leere Listen.
     * Innerhalb dieser Gruppen wird alphabetisch nach Namen sortiert.
     */
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

    /**
     * Lädt alle Daten aus der DB, sortiert sie und rendert die komplette Ansicht neu.
     * Behält den "aufgeklappten" Zustand der Listen bei.
     */
    async function loadAndRenderAll() {
        // Speichert, welche Listen aktuell aufgeklappt sind, um den Zustand beizubehalten.
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

    /**
     * Erstellt das HTML-Element für eine einzelne Aufgaben-Karte.
     * @param {object} task - Das Aufgaben-Objekt aus der DB.
     * @param {string|null} subjectName - Der Name der zugehörigen Liste (optional, für die "Alle Aufgaben"-Ansicht).
     * @returns {HTMLElement} Das `div`-Element der Task-Karte.
     */
    function createTaskElement(task, subjectName = null) {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card';
        taskCard.dataset.taskId = task.id;
        if (task.isDone) taskCard.classList.add('is-done');
        if (task.isImportant) taskCard.classList.add('is-important');

        const title = task.title || task.description || 'Unbenannte Aufgabe'; // `description` für Abwärtskompatibilität
        const notes = task.notes || '';
        const checklist = task.checklist || [];

        // Checklisten-Zähler
        let checklistCounterHtml = '';
        if (checklist.length > 0) {
            const doneCount = checklist.filter(item => item.isDone).length;
            checklistCounterHtml = `<span class="checklist-counter" title="Checkliste">${doneCount}/${checklist.length}</span>`;
        }

        // "Wichtig"-Icon
        const priorityIconHtml = task.isImportant ? `<span class="task-priority-icon" title="Wichtig">!</span>` : '';

        // Datums/Uhrzeit-Text
        let dueDateTimeHtml = '';
        if (task.dueDate) {
            const date = new Date(task.dueDate + 'T00:00:00');
            const dateString = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeString = task.dueTime ? `, ${task.dueTime} Uhr` : '';
            dueDateTimeHtml = `<div class="task-due-date">Fällig am: ${dateString}${timeString}</div>`;
        }

        // Notizen
        const notesHtml = notes ? `<p class="task-notes-preview">${notes}</p>` : '';

        // Checkliste
        let checklistHtml = '';
        if (checklist.length > 0) {
            checklistHtml = '<ul class="task-checklist-preview">';
            checklist.forEach(item => {
                checklistHtml += `
                    <li data-item-id="${item.id}">
                        <input type="checkbox" class="sub-task-checkbox" ${item.isDone ? 'checked' : ''}>
                        <span>${item.text}</span>
                    </li>`;
            });
            checklistHtml += '</ul>';
        }

        // Logik für den aufklappbaren Bereich ("Mehr...")
        const hasCollapsibleContent = !!( notesHtml || checklistHtml);
        taskCard.classList.toggle('has-details', hasCollapsibleContent);
        let moreIndicatorHtml = ''; if (hasCollapsibleContent) {
            // Wir verwenden '...' als einfachen Indikator
            moreIndicatorHtml = '<span class="more-indicator" title="Details anzeigen">...</span>';
        }

        // Alles zusammensetzen
        taskCard.innerHTML = `
            <div class="task-header">
                <input type="checkbox" class="task-checkbox" ${task.isDone ? 'checked' : ''}>
                <div class="task-title-group">
                    <div class="task-subject-name">${subjectName || ''}</div>
                    ${dueDateTimeHtml}
                    <div class="task-title">
                        ${priorityIconHtml}
                        <span>${title}</span>
                    </div>
                </div>
                ${checklistCounterHtml}
                ${moreIndicatorHtml} <button class="task-edit-btn" title="Aufgabe bearbeiten">${EDIT_ICON_SVG}</button>
            </div>
            ${hasCollapsibleContent ? `
                <div class="task-collapsible-content">
                    ${notesHtml}
                    ${checklistHtml}
                </div>` : ''}
        `;

        // Namen ausblenden, wenn nicht vorhanden (für "Gesamt"-Liste)
        if (!subjectName) {
            const subjectNameEl = taskCard.querySelector('.task-subject-name');
            if (subjectNameEl) subjectNameEl.style.display = 'none';
        }
        return taskCard;
    }

    /**
     * Rendert die Listenansicht ("Balken"-Ansicht).
     * Erstellt eine spezielle "Alle offenen Aufgaben"-Liste und dann eine Liste für jedes Fach.
     */
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

    /**
     * Rendert die Spaltenansicht. Jede Liste wird zu einer eigenen Spalte.
     */
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

    
    // --- 7. IMPORT / EXPORT FUNKTIONEN ---

    /**
     * Sammelt alle Daten aus der IndexedDB und löst den Download als JSON-Datei aus.
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
     * Verarbeitet die ausgewählte Backup-Datei.
     * Liest die JSON-Datei und startet den Zusammenführungsprozess.
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
     * Verhindert Duplikate bei Listen (gleicher Name) und Aufgaben (gleicher Titel, Liste, Fälligkeitsdatum).
     */
    async function mergeData(importedData) {
        const subjectsToImport = importedData.subjects || [];
        const tasksToImport = importedData.tasks || [];
        
        const currentSubjects = await getAllFromDB('subjects');
        const currentTasks = await getAllFromDB('tasks');

        // Map für existierende Listennamen -> ID, um Duplikate zu erkennen.
        const subjectNameMap = new Map(currentSubjects.map(s => [s.name.toLowerCase(), s.id]));
        
        // Map für "alte" Import-ID -> "neue" DB-ID, um Tasks korrekt zuzuordnen.
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
        // Eine Signatur identifiziert eine Aufgabe eindeutig.
        const taskSignatureMap = new Set(
            currentTasks.map(t => {
                const title = t.title || t.description || '';
                return `${t.subjectId}-${title.trim()}-${t.dueDate || null}`;
            })
        );

        for (const task of tasksToImport) {
            // Finde die korrekte (neue oder existierende) Listen-ID
            const newSubjectId = oldIdToNewIdMap.get(task.subjectId);

            if (!newSubjectId) {
                console.warn(`Überspringe Task, da zugehörige Liste nicht gefunden wurde: ${task.title || task.description}`);
                continue;
            }
            
            const taskTitle = task.title || task.description || '';
            const taskSignature = `${newSubjectId}-${taskTitle.trim()}-${task.dueDate || null}`;
            
            if (taskSignatureMap.has(taskSignature)) {
                console.log(`Überspringe Duplikat-Task: ${taskTitle}`);
            } else {
                // Task ist neu, wir fügen ihn mit den neuen Feldern hinzu
                const newTask = {
                    subjectId: newSubjectId, // Die neue/gemappte Listen-ID
                    title: taskTitle,
                    notes: task.notes || '',
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

    // --- 8. BACKUP-ERINNERUNG ---

    /**
     * Prüft, ob das letzte Backup länger als eine Woche her ist und zeigt ggf. das Banner an.
     */
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

    /**
     * Versteckt das Backup-Erinnerungs-Banner.
     */
    function hideBackupReminder() {
        backupReminder.style.display = 'none';
        document.querySelector('.settings-header').style.top = '60px'; // Standard-Position
    }


    // --- 9. EVENT-LISTENER ---

    /**
     * Richtet alle Event-Listener für die Anwendung ein.
     */
    function setupEventListeners() {

        // App-Version in den Einstellungen setzen
        if (appVersionDisplay) {
            appVersionDisplay.textContent = APP_VERSION;
        }

        // Header-Buttons
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

        refreshBtn.addEventListener('click', async () => {
            console.log("Refreshing view...");
            await loadAndRenderAll(); // Ruft die Funktion auf, die alles neu zeichnet und sortiert
        });

        addSubjectBtn.addEventListener('click', () => {
            showModal(addSubjectModal);
            subjectNameInput.focus(); 
        });

        // Navigation zur Einstellungs-Seite
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

        // Import/Export Listener
        exportDataBtn.addEventListener('click', handleExport);
        importDataBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', handleImport);

        // Backup-Banner Listener
        backupReminderCloseBtn.addEventListener('click', hideBackupReminder);
        backupReminderBtn.addEventListener('click', () => {
            hideBackupReminder();
            settingsBtn.click(); // Öffnet die Einstellungsseite
        });

        // Allgemeine Modal-Aktionen (Abbrechen, Schließen, "Wichtig"-Toggle)
        cancelSubjectBtn.addEventListener('click', hideModals);
        cancelTaskBtn.addEventListener('click', hideModals);
        modalBackdrop.addEventListener('click', hideModals);
        cancelEditTaskBtn.addEventListener('click', hideModals); 
        cancelDeleteSubjectBtn.addEventListener('click', hideModals); 
        addTaskPriorityToggle.addEventListener('click', () => addTaskPriorityToggle.classList.toggle('active'));
        editTaskPriorityToggle.addEventListener('click', () => editTaskPriorityToggle.classList.toggle('active'));

        // Speichern einer neuen Liste
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

        // Speichern einer neuen Aufgabe
        saveTaskBtn.addEventListener('click', async () => {
            const title = addTaskTitleInput.value.trim();
            const subjectId = parseInt(taskSubjectIdInput.value);

            if (title && subjectId) {
                const newTask = {
                    subjectId: subjectId,
                    title: title, // Neues Feld
                    notes: addTaskNotesInput.value.trim(), // Neues Feld
                    dueDate: addTaskDueDateInput.value || null,
                    dueTime: addTaskDueTimeInput.value || null, // Neues Feld
                    isImportant: addTaskPriorityToggle.classList.contains('active'),
                    checklist: modalChecklistState, // Neues Feld (aus State)
                    isDone: false
                };
                await addToDB('tasks', newTask);
                hideModals();
                await loadAndRenderAll();
            } else {
                alert('Bitte mindestens einen Titel eingeben.');
            }
        });

        // Speichern einer bearbeiteten Aufgabe
        saveEditTaskBtn.addEventListener('click', async () => {
            const id = parseInt(editTaskIdInput.value);
            const title = editTaskTitleInput.value.trim();

            if (!id || !title) return;
            try {
                const originalTask = await getFromDB('tasks', id);
                if (!originalTask) return;

                // Alle Felder aktualisieren
                originalTask.title = title;
                originalTask.notes = editTaskNotesInput.value.trim();
                originalTask.dueDate = editTaskDueDateInput.value || null;
                originalTask.dueTime = editTaskDueTimeInput.value || null;
                originalTask.isImportant = editTaskPriorityToggle.classList.contains('active');
                originalTask.checklist = modalChecklistState;
                // isDone wird NICHT hier geändert, nur über Checkbox

                await updateInDB('tasks', originalTask);
                hideModals();
                await loadAndRenderAll();
            } catch (error) {
                console.error('Fehler beim Speichern der Änderungen:', error);
            }
        });

        // Bestätigen des Löschens einer Liste
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

        // --- Checklisten-Editor Logik (für beide Modals) ---
        // Diese Funktion richtet die Listener für einen Checklisten-Editor ein.
        const setupChecklistEditor = (input, button, list) => {
            button.addEventListener('click', () => handleAddChecklistItem(input, list));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleAddChecklistItem(input, list);
            });
            list.addEventListener('click', (e) => handleDeleteChecklistItem(e, list));
        };
        // Einmal für das "Neue Aufgabe"-Modal...
        setupChecklistEditor(addChecklistItemInput, addChecklistItemBtn, addChecklistItemsList);
        // ...und einmal für das "Aufgabe bearbeiten"-Modal.
        setupChecklistEditor(editChecklistItemInput, editChecklistItemBtn, editChecklistItemsList);


        // --- Event Delegation für dynamisch erstellte Elemente ---
        document.body.addEventListener('click', async (event) => {
            const target = event.target;
            const balkenHeader = target.closest('.balken-header');
            if (balkenHeader && !target.closest('button')) {
                balkenHeader.parentElement.classList.toggle('expanded');
            }
            const addTaskBtnList = target.closest('.add-task-btn');

            // Klick auf "+"-Button in der Listenansicht
            if (addTaskBtnList) {
                const subjectId = parseInt(addTaskBtnList.closest('.subject-balken').dataset.subjectId);
                taskSubjectIdInput.value = subjectId; 
                showModal(addTaskModal);
                addTaskTitleInput.focus();
            }
            const addTaskBtnColumn = target.closest('.add-task-btn-column');

            // Klick auf "+ Aufgabe hinzufügen"-Button in der Spaltenansicht
            if (addTaskBtnColumn) {
                const subjectId = parseInt(addTaskBtnColumn.closest('.subject-column').dataset.subjectId);
                taskSubjectIdInput.value = subjectId; 
                showModal(addTaskModal);
                addTaskTitleInput.focus();
            }
            const deleteTaskBtn = target.closest('.delete-task-btn');

            // Klick auf "Löschen"-Button einer Aufgabe (existiert nicht mehr, aber sicherheitshalber drin lassen)
            if (deleteTaskBtn) {
                const taskId = parseInt(deleteTaskBtn.closest('.task-card').dataset.taskId);
                if (confirm('Möchtest du diese Aufgabe wirklich löschen?')) {
                    await deleteFromDB('tasks', taskId);
                    await loadAndRenderAll(); 
                }
            }

            // Klick auf "Löschen"-Button einer Liste
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

            // Klick auf "Bearbeiten"-Stift einer Aufgabe
            const taskEditBtn = target.closest('.task-edit-btn');
            if (taskEditBtn) {
                const taskId = parseInt(taskEditBtn.closest('.task-card').dataset.taskId);
                await openEditTaskModal(taskId);
            }

            // Klick auf eine Task-Karte, um sie auf-/zuzuklappen (wenn sie Details hat)
            const taskHeader = target.closest('.task-header');
            if (taskHeader && !target.closest('button') && !target.closest('input')) { // Nicht auf Buttons/Checkbox
                const taskCard = taskHeader.closest('.task-card');
                if (taskCard.classList.contains('has-details')) { // Nur wenn Inhalt da ist
                    taskCard.classList.toggle('expanded');
                }
            }
        });
        
        // Separater Listener für 'change'-Events, hauptsächlich für Checkboxen.
        document.body.addEventListener('change', async (event) => {
            const target = event.target;

            // Haupt-Checkbox einer Aufgabe wird geändert
            if (target.classList.contains('task-checkbox')) {
                const taskId = parseInt(target.closest('.task-card').dataset.taskId);
                const isDone = target.checked;
                const taskToUpdate = await getFromDB('tasks', taskId);
                if (taskToUpdate) {
                    taskToUpdate.isDone = isDone;
                    await updateInDB('tasks', taskToUpdate);
                    target.closest('.task-card').classList.toggle('is-done', isDone);
                }
            }

            // Checkbox einer Unteraufgabe (Checkliste) wird geändert
            if (target.classList.contains('sub-task-checkbox')) {
                const taskId = parseInt(target.closest('.task-card').dataset.taskId);
                const subTaskId = target.closest('li').dataset.itemId;
                const isDone = target.checked;

                const taskToUpdate = await getFromDB('tasks', taskId);
                if (taskToUpdate && taskToUpdate.checklist) {
                    const item = taskToUpdate.checklist.find(item => item.id === subTaskId);
                    if (item) {
                        item.isDone = isDone;
                        await updateInDB('tasks', taskToUpdate);

                        // Nur den Zähler auf der Karte aktualisieren
                        const taskCardElement = target.closest('.task-card');
                        const counterElement = taskCardElement.querySelector('.checklist-counter');
                        if (counterElement) {
                             const doneCount = taskToUpdate.checklist.filter(i => i.isDone).length;
                             const totalCount = taskToUpdate.checklist.length;
                             counterElement.textContent = `${doneCount}/${totalCount}`;
                        }
                    }
                }
            }
        });
    }

    // --- 10. INITIALISIERUNG ---
    initDatabase();
    setupEventListeners();
    requestPersistentStorage();

});