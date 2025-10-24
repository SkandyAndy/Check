// Wir warten, bis die HTML-Seite komplett geladen ist.
document.addEventListener('DOMContentLoaded', () => {

    // --- VARIABLEN & DOM-ELEMENTE ---

    // Datenbank-Referenz (wird später befüllt)
    let db;

    // Aktueller Ansichts-Status (list | column)
    let currentView = 'list';

    // Buttons im Header
    const viewToggleBtn = document.getElementById('view-toggle-btn');
    const addSubjectBtn = document.getElementById('add-subject-btn');
    
    // Ansichts-Container
    const listView = document.getElementById('list-view');
    const columnView = document.getElementById('column-view');

    // Modal-Elemente
    const modalBackdrop = document.getElementById('modal-backdrop');
    const addSubjectModal = document.getElementById('add-subject-modal');
    const addTaskModal = document.getElementById('add-task-modal');
    
    // "Neues Fach" Modal-Felder
    const subjectNameInput = document.getElementById('subject-name-input');
    const saveSubjectBtn = document.getElementById('save-add-subject');
    const cancelSubjectBtn = document.getElementById('cancel-add-subject');

    // "Neue Aufgabe" Modal-Felder
    const taskSubjectIdInput = document.getElementById('task-subject-id-input');
    const taskDescInput = document.getElementById('task-desc-input');
    const taskDueDateInput = document.getElementById('task-due-date-input');
    const saveTaskBtn = document.getElementById('save-add-task');
    const cancelTaskBtn = document.getElementById('cancel-add-task');

    // Icons für den View-Toggle-Button
    const LIST_VIEW_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24"><path d="M440 856V616H200v240h240Zm320 0V616H520v240h240ZM200 536V296h240v240H200Zm320 0V296h240v240H520Z"/></svg>`;
    const COLUMN_VIEW_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 96 960 960" width="24"><path d="M200 856V296h120v560H200Zm240 0V296h120v560H440Zm240 0V296h120v560H680Z"/></svg>`;


    // --- DATENBANK (INDEXEDDB) ---

    /**
     * Initialisiert die IndexedDB-Datenbank.
     */
    function initDatabase() {
        // Öffnet (oder erstellt) die Datenbank 'SchoolAppDB' Version 1
        const request = indexedDB.open('SchoolAppDB', 1);

        // Fehlerbehandlung
        request.onerror = (event) => {
            console.error('Datenbank-Fehler:', event.target.error);
        };

        // Erfolgreich geöffnet
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Datenbank erfolgreich geöffnet.');
            // Sobald die DB bereit ist, laden und rendern wir alles.
            loadAndRenderAll();
        };

        // Wird ausgeführt, wenn die DB erstellt oder die Version erhöht wird.
        request.onupgradeneeded = (event) => {
            let db = event.target.result;

            // 1. "Tabelle" (Object Store) für Fächer
            // keyPath 'id' wird automatisch hochgezählt (autoIncrement)
            if (!db.objectStoreNames.contains('subjects')) {
                db.createObjectStore('subjects', { keyPath: 'id', autoIncrement: true });
            }

            // 2. "Tabelle" (Object Store) für Aufgaben
            if (!db.objectStoreNames.contains('tasks')) {
                const tasksStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
                
                // Wir erstellen einen Index 'subjectId', damit wir
                // später schnell alle Aufgaben zu einem Fach finden können.
                tasksStore.createIndex('subjectId', 'subjectId', { unique: false });
            }
        };
    }

    /**
     * Liest alle Einträge aus einem Store (Tabelle).
     * @param {string} storeName - Der Name des Stores ('subjects' oder 'tasks')
     * @returns {Promise<Array>} - Ein Promise, das mit einem Array der Daten aufgelöst wird.
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
     * Fügt einen Eintrag zu einem Store hinzu.
     * @param {string} storeName - 'subjects' oder 'tasks'
     * @param {object} data - Das zu speichernde Objekt
     * @returns {Promise<number>} - Ein Promise, das mit der ID des neuen Eintrags aufgelöst wird.
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
     * Aktualisiert einen bestehenden Eintrag.
     * @param {string} storeName - 'subjects' oder 'tasks'
     * @param {object} data - Das zu aktualisierende Objekt (muss eine 'id' haben)
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
     * Löscht einen Eintrag aus einem Store.
     * @param {string} storeName - 'subjects' oder 'tasks'
     * @param {number} id - Die ID des zu löschenden Eintrags
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


    // --- MODAL (POP-UP) STEUERUNG ---

    /** Zeigt ein Modal und das Backdrop an */
    function showModal(modalElement) {
        modalBackdrop.classList.add('active');
        modalElement.classList.add('active');
    }

    /** Versteckt alle Modals und das Backdrop */
    function hideModals() {
        modalBackdrop.classList.remove('active');
        addSubjectModal.classList.remove('active');
        addTaskModal.classList.remove('active');
        
        // Formulare zurücksetzen
        subjectNameInput.value = '';
        taskDescInput.value = '';
        taskDueDateInput.value = '';
        taskSubjectIdInput.value = '';
    }

    // --- RENDER-FUNKTIONEN (ZEICHNEN DER UI) ---

    /**
     * Hauptfunktion: Lädt alle Daten aus der DB und ruft die Render-Funktionen auf.
     */
    async function loadAndRenderAll() {
        try {
            // Daten parallel laden
            const [subjects, tasks] = await Promise.all([
                getAllFromDB('subjects'),
                getAllFromDB('tasks')
            ]);
            
            console.log('Daten geladen:', { subjects, tasks });

            // Beide Ansichten mit den frischen Daten neu zeichnen
            renderListView(subjects, tasks);
            renderColumnView(subjects, tasks);

        } catch (error) {
            console.error('Fehler beim Laden und Rendern:', error);
        }
    }

    /**
     * Erstellt ein einzelnes Task-Karten-Element (wird von beiden Ansichten genutzt).
     * @param {object} task - Das Aufgaben-Objekt aus der DB.
     * @returns {HTMLElement} - Das 'div.task-card' Element.
     */
    function createTaskElement(task) {
        const taskCard = document.createElement('div');
        taskCard.className = 'task-card';
        taskCard.dataset.taskId = task.id; // Wichtig für Klick-Handler
        if (task.isDone) {
            taskCard.classList.add('is-done');
        }

        // Fälligkeitsdatum formatieren (z.B. "Fällig am: 24.10.2025")
        let dueDateHtml = '';
        if (task.dueDate) {
            const date = new Date(task.dueDate + 'T00:00:00'); // Zeit setzen, um Zeitzonenprobleme zu vermeiden
            const formattedDate = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
            dueDateHtml = `<div class="task-due-date">Fällig am: ${formattedDate}</div>`;
        }

        taskCard.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.isDone ? 'checked' : ''}>
            <div class="task-details">
                <div class="task-description">${task.description}</div>
                ${dueDateHtml}
            </div>
            <button class="delete-task-btn" title="Aufgabe löschen">X</button>
        `;
        return taskCard;
    }

    /**
     * Zeichnet die komplette "Balken"-Ansicht (Ansicht 1)
     */
    function renderListView(subjects, tasks) {
        // Alte Inhalte leeren
        listView.innerHTML = '';

        if (subjects.length === 0) {
            listView.innerHTML = '<p class="empty-state">Noch keine Fächer. Füge oben rechts (+) ein Fach hinzu.</p>';
            return;
        }

        subjects.forEach(subject => {
            // Alle Tasks für dieses Fach filtern
            const tasksForSubject = tasks.filter(t => t.subjectId === subject.id);
            // Zählen, wie viele davon erledigt sind
            const doneCount = tasksForSubject.filter(t => t.isDone).length;
            const totalCount = tasksForSubject.length;

            // 1. "Balken" (Wrapper) erstellen
            const balken = document.createElement('div');
            balken.className = 'subject-balken';
            balken.dataset.subjectId = subject.id; // Wichtig für Klick-Handler

            // 2. Header des Balkens erstellen
            balken.innerHTML = `
                <div class="balken-header">
                    <span class="subject-name">${subject.name}</span>
                    <span class="task-counter">${doneCount}/${totalCount}</span>
                    <button class="add-task-btn" title="Neue Aufgabe">+</button>
                </div>
            `;

            // 3. Aufklappbare Task-Liste erstellen
            const taskList = document.createElement('div');
            taskList.className = 'task-list-collapsible';
            
            // Jede Aufgabe als Task-Element hinzufügen
            if (tasksForSubject.length > 0) {
                tasksForSubject.forEach(task => {
                    taskList.appendChild(createTaskElement(task));
                });
            } else {
                taskList.innerHTML = '<p class="empty-task-list">Keine Aufgaben für dieses Fach.</p>';
            }

            balken.appendChild(taskList);
            listView.appendChild(balken);
        });
    }

    /**
     * Zeichnet die komplette "Spalten"-Ansicht (Ansicht 2)
     */
    function renderColumnView(subjects, tasks) {
        // Alte Inhalte leeren
        columnView.innerHTML = '';

        if (subjects.length === 0) {
            // In dieser Ansicht ist kein Platz für einen "Empty State"
            return;
        }

        subjects.forEach(subject => {
            // 1. Spalte erstellen
            const column = document.createElement('div');
            column.className = 'subject-column';
            column.dataset.subjectId = subject.id; // Wichtig für Klick-Handler

            // 2. Spalten-Inhalt (Titel, Task-Liste, Button)
            column.innerHTML = `
                <h2>${subject.name}</h2>
                <div class="task-list">
                    </div>
                <button class="add-task-btn-column" title="Neue Aufgabe">+ Aufgabe hinzufügen</button>
            `;

            // 3. Task-Liste befüllen
            const taskList = column.querySelector('.task-list');
            const tasksForSubject = tasks.filter(t => t.subjectId === subject.id);

            if (tasksForSubject.length > 0) {
                tasksForSubject.forEach(task => {
                    taskList.appendChild(createTaskElement(task));
                });
            } else {
                taskList.innerHTML = '<p class="empty-task-list">Keine Aufgaben.</p>';
            }

            columnView.appendChild(column);
        });
    }


    // --- EVENT-LISTENER (BENUTZER-AKTIONEN) ---

    /**
     * Richtet alle globalen Klick-Handler ein.
     */
    function setupEventListeners() {

        // --- Header-Buttons ---

        // Ansicht umschalten
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

        // "Neues Fach" Modal öffnen
        addSubjectBtn.addEventListener('click', () => {
            showModal(addSubjectModal);
            subjectNameInput.focus(); // Direkt ins Textfeld springen
        });

        // --- Modal-Aktionen ---

        // Modal "Neues Fach" ABBRECHEN
        cancelSubjectBtn.addEventListener('click', hideModals);
        
        // Modal "Neue Aufgabe" ABBRECHEN
        cancelTaskBtn.addEventListener('click', hideModals);
        
        // Modal-Hintergrund-Klick schliesst auch
        modalBackdrop.addEventListener('click', hideModals);

        // Modal "Neues Fach" SPEICHERN
        saveSubjectBtn.addEventListener('click', async () => {
            const name = subjectNameInput.value.trim();
            if (name) {
                await addToDB('subjects', { name: name });
                hideModals();
                await loadAndRenderAll(); // Alles neu laden und zeichnen
            } else {
                alert('Bitte einen Fachnamen eingeben.');
            }
        });

        // Modal "Neue Aufgabe" SPEICHERN
        saveTaskBtn.addEventListener('click', async () => {
            const description = taskDescInput.value.trim();
            const dueDate = taskDueDateInput.value;
            const subjectId = parseInt(taskSubjectIdInput.value); // Wichtig: ID in Zahl umwandeln

            if (description && subjectId) {
                const newTask = {
                    subjectId: subjectId,
                    description: description,
                    dueDate: dueDate || null, // Speichere null, wenn kein Datum gesetzt
                    isDone: false
                };
                await addToDB('tasks', newTask);
                hideModals();
                await loadAndRenderAll(); // Alles neu laden und zeichnen
            } else {
                alert('Bitte eine Beschreibung eingeben.');
            }
        });


        // --- Event Delegation für dynamische Inhalte (Tasks & Fächer) ---
        // Wir lauschen auf Klicks im ganzen 'body' und schauen dann,
        // *wo* genau geklickt wurde. Das ist viel effizienter als
        // hunderte Listener an jede einzelne Task-Karte zu hängen.

        document.body.addEventListener('click', async (event) => {
            const target = event.target; // Das Element, das geklickt wurde

            // AKTION: Balken auf/zuklappen
            // (Klick auf den Header-Teil des Balkens)
            const balkenHeader = target.closest('.balken-header');
            if (balkenHeader) {
                // Verhindern, dass der Klick auf den "+"-Button auch den Balken zuklappt
                if (!target.classList.contains('add-task-btn')) {
                    balkenHeader.parentElement.classList.toggle('expanded');
                }
            }
            
            // AKTION: "Neue Aufgabe" (im Balken)
            const addTaskBtnList = target.closest('.add-task-btn');
            if (addTaskBtnList) {
                const subjectId = parseInt(addTaskBtnList.closest('.subject-balken').dataset.subjectId);
                taskSubjectIdInput.value = subjectId; // Verstecktes Feld befüllen
                showModal(addTaskModal);
                taskDescInput.focus();
            }
            
            // AKTION: "Neue Aufgabe" (in Spalte)
            const addTaskBtnColumn = target.closest('.add-task-btn-column');
            if (addTaskBtnColumn) {
                const subjectId = parseInt(addTaskBtnColumn.closest('.subject-column').dataset.subjectId);
                taskSubjectIdInput.value = subjectId; // Verstecktes Feld befüllen
                showModal(addTaskModal);
                taskDescInput.focus();
            }

            // AKTION: Aufgabe löschen
            const deleteTaskBtn = target.closest('.delete-task-btn');
            if (deleteTaskBtn) {
                const taskId = parseInt(deleteTaskBtn.closest('.task-card').dataset.taskId);
                if (confirm('Möchtest du diese Aufgabe wirklich löschen?')) {
                    await deleteFromDB('tasks', taskId);
                    await loadAndRenderAll(); // Neu zeichnen
                }
            }
            
            // AKTION: Aufgabe abhaken (Checkbox)
            // Wichtig: Wir nutzen 'change' statt 'click' für Checkboxen
        });
        
        // Separater Listener für 'change' Events (Checkboxes)
        document.body.addEventListener('change', async (event) => {
            const target = event.target;
            
            if (target.classList.contains('task-checkbox')) {
                const taskCard = target.closest('.task-card');
                const taskId = parseInt(taskCard.dataset.taskId);
                const isDone = target.checked;

                // 1. Task-Objekt aus DB holen (wir brauchen das ganze Objekt für 'update')
                const transaction = db.transaction('tasks', 'readonly');
                const store = transaction.objectStore('tasks');
                const request = store.get(taskId);
                
                request.onsuccess = async () => {
                    const taskToUpdate = request.result;
                    if (taskToUpdate) {
                        // 2. Status ändern
                        taskToUpdate.isDone = isDone;
                        // 3. Task in DB zurückspeichern
                        await updateInDB('tasks', taskToUpdate);
                        // 4. UI neu laden (damit auch der Zähler "x/y" stimmt)
                        await loadAndRenderAll();
                    }
                };
            }
        });
    }

    // --- INITIALISIERUNG ---
    // App starten
    initDatabase();
    setupEventListeners();

});