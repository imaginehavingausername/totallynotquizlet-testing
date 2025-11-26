document.addEventListener('DOMContentLoaded', () => {

    // --- STATE ---
    const app = {
        // MODIFIED: Deck is now an object with title, cards, and settings
        currentDeck: {
            title: '',
            cards: [],
            settings: {
                shuffle: false,
                termFirst: true
            }
        },
        currentDeckHash: '', // NEW: To track which deck the session belongs to
        studyDeck: [], // A (potentially shuffled) copy of cards for studying
        learnSessionCards: [], // Cards for the current learn session
        typeSessionCards: [], // NEW: Cards for the current type session
        matchSessionCards: [], // NEW: Cards for the current match session
        currentCardIndex: 0,
        currentMode: 'flashcards', // 'flashcards', 'learn', 'type', 'match', 'create', 'empty'
        currentLearnCard: null,
        currentTypeCard: null, // NEW
        lastTypeCard: null, // NEW: For the override button
        
        // NEW: Match game state
        selectedTerm: null,
        selectedDef: null,
        matchTimerInterval: null,
        matchStartTime: 0,
        matchItemsLeft: 0,
        matchBestTime: Infinity, // NEW
        matchStorageKey: 'flashcardAppMatchBestTime', // NEW
        isCheckingMatch: false, // Prevents double-clicks

        progressData: new Map(), // Stores progress keyed by 'term|definition'
        localStorageKey: 'flashcardAppProgress', // For SRS card scores
        sessionStorageKey: 'flashcardAppSessionState', // NEW: For learn/type session
        themeKey: 'flashcardAppTheme',
        historyStorageKey: 'flashcardAppHistory', // NEW: For session history
        toastTimeout: null,
        correctAnswerTimeout: null, // NEW: For auto-advancing on correct
        isAnimating: false,
        draggedItem: null, // For drag and drop
        createMode: 'manual', // 'manual' or 'paste'
        // NEW: Swipe navigation
        touchStartX: 0,
        touchStartY: 0,
        touchEndX: 0,
        touchEndY: 0,
        settingsBeforeEdit: null, // NEW: To track changes in settings modal
        isCreateDeckDirty: false, // NEW: For unsaved changes
        pendingModeChange: null, // NEW: For unsaved changes
        currentSessionStats: null, // NEW: For tracking session performance
        progressChartInstance: null, // NEW: To hold the Chart.js object
    };

    // --- DOM ELEMENTS ---
    const dom = {
        body: document.body,
        headerTitle: document.getElementById('header-title'), // NEW
        navButtons: document.querySelectorAll('.nav-button'),
        shareDeckButton: document.getElementById('share-deck-button'),
        
        // Create View (MODIFIED)
        createView: document.getElementById('create-view'),
        deckTitleInput: document.getElementById('deck-title-input'), // NEW
        toggleManualButton: document.getElementById('toggle-manual-button'), // NEW
        togglePasteButton: document.getElementById('toggle-paste-button'), // NEW
        clearCreateButton: document.getElementById('clear-create-button'), // NEW
        manualInputSection: document.getElementById('manual-input-section'), // NEW
        pasteInputSection: document.getElementById('paste-input-section'), // NEW
        cardEditorList: document.getElementById('card-editor-list'), // NEW
        addCardButton: document.getElementById('add-card-button'), // NEW
        deckInputArea: document.getElementById('deck-input-area'), // Kept for paste
        parseDeckButton: document.getElementById('parse-deck-button'), // Kept (now "Create Deck")

        // Flashcard View
        flashcardsView: document.getElementById('flashcards-view'),
        flashcardContainer: document.getElementById('flashcard-container'),
        flashcardFront: document.getElementById('flashcard-front').querySelector('p'),
        flashcardBack: document.getElementById('flashcard-back').querySelector('p'),
        prevCardButton: document.getElementById('prev-card-button'),
        nextCardButton: document.getElementById('next-card-button'),
        cardCounter: document.getElementById('card-counter'),

        // Learn View
        learnView: document.getElementById('learn-view'),
        learnProgressBarContainer: document.getElementById('learn-progress-container'), // NEW
        learnProgressBar: document.getElementById('learn-progress-bar'), // NEW
        learnModeDisabled: document.getElementById('learn-mode-disabled'),
        learnModeQuiz: document.getElementById('learn-mode-quiz'),
        learnTerm: document.getElementById('learn-term'),
        learnOptions: document.getElementById('learn-options'),
        learnFeedbackContainer: document.getElementById('learn-feedback-container'), // MODIFIED
        learnFeedback: document.getElementById('learn-feedback'),
        learnFeedbackMessage: document.getElementById('learn-feedback-message'), // NEW
        learnContinueButton: document.getElementById('learn-continue-button'), // NEW
        learnCompleteView: document.getElementById('learn-complete-view'),
        learnRestartButton: document.getElementById('learn-restart-button'),
        // MODIFIED: Corrected the ID to match the HTML
        learnSwitchModeButton: document.getElementById('learn-switch-mode-button'), 

        // NEW: Type View
        typeView: document.getElementById('type-view'),
        typeProgressBarContainer: document.getElementById('type-progress-container'), // NEW
        typeProgressBar: document.getElementById('type-progress-bar'), // NEW
        typeModeDisabled: document.getElementById('type-mode-disabled'),
        typeModeQuiz: document.getElementById('type-mode-quiz'),
        typeCompleteView: document.getElementById('type-complete-view'),
        typeQuestionBox: document.getElementById('type-question-box'),
        typeQuestionTerm: document.getElementById('type-question-term'),
        typeInputForm: document.getElementById('type-input-form'),
        typeInputArea: document.getElementById('type-input-area'),
        typeSubmitButton: document.getElementById('type-submit-button'),
        typeFeedbackContainer: document.getElementById('type-feedback-container'), // MODIFIED
        typeFeedback: document.getElementById('type-feedback'),
        typeFeedbackMessage: document.getElementById('type-feedback-message'),
        typeFeedbackCorrectAnswer: document.getElementById('type-feedback-correct-answer'),
        typeOverrideWrongButton: document.getElementById('type-override-wrong-button'), // MODIFIED
        typeOverrideCorrectButton: document.getElementById('type-override-correct-button'), // NEW
        typeContinueButton: document.getElementById('type-continue-button'), // NEW
        typeRestartButton: document.getElementById('type-restart-button'),
        typeSwitchModeButton: document.getElementById('type-switch-mode-button'),

        // NEW: Match View
        matchView: document.getElementById('match-view'),
        matchModeDisabled: document.getElementById('match-mode-disabled'),
        matchModeGame: document.getElementById('match-mode-game'),
        matchCompleteView: document.getElementById('match-complete-view'),
        matchTimer: document.getElementById('match-timer'),
        matchBestTime: document.getElementById('match-best-time'), // NEW
        matchStartScreen: document.getElementById('match-start-screen'), // NEW
        matchStartButton: document.getElementById('match-start-button'), // NEW
        matchGameArea: document.getElementById('match-game-area'),
        matchTermsList: document.getElementById('match-terms-list'),
        matchDefsList: document.getElementById('match-defs-list'),
        matchRestartButton: document.getElementById('match-restart-button'),

        // Other
        toastNotification: document.getElementById('toast-notification'),
        emptyDeckView: document.getElementById('empty-deck-view'),

        // NEW: Theme Toggle Elements
        themeToggleButton: document.getElementById('theme-toggle-button'),
        themeIconSun: document.getElementById('theme-icon-sun'),
        themeIconMoon: document.getElementById('theme-icon-moon'),

        // NEW: About Modal Elements
        aboutButton: document.getElementById('about-button'),
        aboutModalOverlay: document.getElementById('about-modal-overlay'),
        aboutModalClose: document.getElementById('about-modal-close'),
        aboutModalBackdrop: document.querySelector('#about-modal-overlay .modal-backdrop'),

        // NEW: Settings Modal Elements
        settingsButton: document.getElementById('settings-button'),
        settingsModalOverlay: document.getElementById('settings-modal-overlay'),
        settingsModalClose: document.getElementById('settings-modal-close'),
        settingsModalBackdrop: document.querySelector('#settings-modal-overlay .modal-backdrop'),
        settingDeckTitle: document.getElementById('setting-deck-title'),
        settingToggleShuffle: document.getElementById('setting-toggle-shuffle'),
        settingToggleStartWith: document.getElementById('setting-toggle-start-with'),
        copyDeckButton: document.getElementById('copy-deck-button'), // NEW

        // NEW: Clear Confirm Modal Elements
        clearConfirmModalOverlay: document.getElementById('clear-confirm-modal-overlay'),
        clearConfirmButton: document.getElementById('clear-confirm-button'),
        clearCancelButton: document.getElementById('clear-cancel-button'),

        // NEW: Unsaved Changes Modal Elements
        unsavedChangesModalOverlay: document.getElementById('unsaved-changes-modal-overlay'),
        unsavedSaveButton: document.getElementById('unsaved-save-button'),
        unsavedDiscardButton: document.getElementById('unsaved-discard-button'),
        unsavedCancelButton: document.getElementById('unsaved-cancel-button'),

        // NEW: Progress View Elements
        progressView: document.getElementById('progress-view'),
        masteryStatsContainer: document.getElementById('mastery-stats-container'),
        masteryMastered: document.getElementById('mastery-mastered'),
        masteryLearning: document.getElementById('mastery-learning'),
        masteryNotLearned: document.getElementById('mastery-not-learned'),
        progressNoSession: document.getElementById('progress-no-session'),
        progressSessionContainer: document.getElementById('progress-session-container'),
        progressChartContainer: document.getElementById('progress-chart-container'),
        progressPieChart: document.getElementById('progress-pie-chart').getContext('2d'),
        latestSessionStats: document.getElementById('latest-session-stats'),
        progressNoHistory: document.getElementById('progress-no-history'),
        progressHistoryList: document.getElementById('progress-history-list'),
    };

    // --- CONSTANTS ---
    const SRS_INTERVALS = {
        1: 5 * 60 * 1000,         // 5 minutes
        2: 30 * 60 * 1000,        // 30 minutes
        3: 24 * 60 * 60 * 1000,   // 1 day
        4: 3 * 24 * 60 * 60 * 1000, // 3 days
        5: 7 * 24 * 60 * 60 * 1000  // 7 days
    };
    const INCORRECT_INTERVAL = 60 * 1000; // 1 minute
    const TYPE_CLOSE_THRESHOLD = 2; // NEW: Max Levenshtein distance for "close"
    const CORRECT_ANSWER_DELAY = 1000; // NEW: 1 second delay for auto-advance
    const CLOSE_ANSWER_DELAY = 3000; // *** NEW *** 3 second delay for "close" answers
    const MATCH_INCORRECT_DELAY = 1000; // NEW: Delay for match mode
    const MATCH_ROUND_SIZE = 10; // NEW: Max cards per match round

    // --- CORE LOGIC ---

    /**
     * Initializes the application.
     */
    function init() {
        loadTheme(); // NEW: Load theme first
        loadProgressFromLocalStorage();
        loadBestTimeFromLocalStorage(); // NEW
        loadDeckFromURL();
        loadSessionsFromLocalStorage(); // NEW: Must be after loadDeckFromURL
        updateDocumentTitle(); // *** NEW *** Set tab title
        addEventListeners();
        
        // MODIFIED: Check cards array length and show/hide buttons
        if (app.currentDeck.cards.length === 0) {
            dom.settingsButton.classList.add('hidden');
            dom.shareDeckButton.classList.add('hidden');
            setMode('create');
        } else {
            dom.settingsButton.classList.remove('hidden');
            dom.shareDeckButton.classList.remove('hidden');
            dom.headerTitle.textContent = app.currentDeck.title; // Set title
            setMode('flashcards');
        }
    }

    // --- NEW: THEME LOGIC ---

    /**
     * Loads the saved theme from localStorage and applies it.
     * Defaults to 'dark' as requested.
     */
    function loadTheme() {
        const savedTheme = localStorage.getItem(app.themeKey) || 'dark'; // Default to dark
        setTheme(savedTheme);
    }

    /**
     * Toggles the theme between light and dark.
     */
    function toggleTheme() {
        if (dom.body.classList.contains('light-mode')) {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    }

    /**
     * Applies a specific theme and saves it to localStorage.
     * @param {string} theme - 'light' or 'dark'
     */
    function setTheme(theme) {
        if (theme === 'light') {
            dom.body.classList.add('light-mode');
            dom.themeIconSun.classList.add('hidden');
            dom.themeIconMoon.classList.remove('hidden');
        } else {
            dom.body.classList.remove('light-mode');
            dom.themeIconSun.classList.remove('hidden');
            dom.themeIconMoon.classList.add('hidden');
        }
        localStorage.setItem(app.themeKey, theme);
    }

    // --- END THEME LOGIC ---


    /**
     * Loads progress data from localStorage into the app.progressData Map.
     */
    function loadProgressFromLocalStorage() {
        try {
            const storedProgress = localStorage.getItem(app.localStorageKey);
            if (storedProgress) {
                // MODIFICATION: Handle both Map and Object storage formats for safety
                let parsed;
                if (storedProgress.startsWith('[[')) { // Check if it looks like a Map string
                    parsed = JSON.parse(storedProgress);
                    app.progressData = new Map(parsed);
                } else { // Assume old object format
                    parsed = JSON.parse(storedProgress);
                    app.progressData = new Map(Object.entries(parsed));
                }
            }
        } catch (error) {
            console.error("Error loading progress from localStorage:", error);
            app.progressData = new Map();
        }
    }

    /**
     * NEW: Loads Learn/Type session progress from localStorage.
     */
    function loadSessionsFromLocalStorage() {
        try {
            const storedState = localStorage.getItem(app.sessionStorageKey);
            if (!storedState) return;

            const sessionState = JSON.parse(storedState);

            // Check if the saved session is for the currently loaded deck
            if (sessionState && sessionState.deckHash === app.currentDeckHash) {
                // Rebuild learn session
                if (sessionState.learnSessionCardIds) {
                    app.learnSessionCards = sessionState.learnSessionCardIds
                        .map(id => app.currentDeck.cards.find(card => card.id === id))
                        .filter(Boolean); // Filter out any nulls
                }
                // Rebuild type session
                if (sessionState.typeSessionCardIds) {
                    app.typeSessionCards = sessionState.typeSessionCardIds
                        .map(id => app.currentDeck.cards.find(card => card.id === id))
                        .filter(Boolean); // Filter out any nulls
                }
            } else {
                // Mismatch, clear the old session
                localStorage.removeItem(app.sessionStorageKey);
            }
        } catch (error) {
            console.error("Error loading session from localStorage:", error);
            app.learnSessionCards = [];
            app.typeSessionCards = [];
        }
    }

    /**
// ... existing code ... */
    function loadBestTimeFromLocalStorage() {
        try {
// ... existing code ... */
    function saveProgressToLocalStorage() {
        try {
// ... existing code ... */
    function saveSessionsToLocalStorage() {
        try {
            const sessionState = {
                deckHash: app.currentDeckHash,
                learnSessionCardIds: app.learnSessionCards.map(card => card.id),
                typeSessionCardIds: app.typeSessionCards.map(card => card.id)
            };
            localStorage.setItem(app.sessionStorageKey, JSON.stringify(sessionState));
        } catch (error) {
            console.error("Error saving session to localStorage:", error);
        }
    }

    /**
     * NEW: Loads all session history from localStorage.
     * @returns {object} An object containing all history, keyed by deck hash.
     */
    function loadHistoryFromLocalStorage() {
        try {
            const storedHistory = localStorage.getItem(app.historyStorageKey);
            if (storedHistory) {
                return JSON.parse(storedHistory);
            }
        } catch (error) {
            console.error("Error loading session history from localStorage:", error);
        }
        return {}; // Return empty object on failure
    }

    /**
     * NEW: Saves the provided session stats to localStorage.
     * @param {object} session - The session object to save.
     */
    function saveSessionToHistory(session) {
        try {
            const allHistory = loadHistoryFromLocalStorage();
            if (!allHistory[app.currentDeckHash]) {
                allHistory[app.currentDeckHash] = [];
            }
            // Add to the beginning of the array
            allHistory[app.currentDeckHash].unshift(session);
            // Optional: Limit history size, e.g., to last 20 sessions
            if (allHistory[app.currentDeckHash].length > 20) {
                allHistory[app.currentDeckHash].pop();
            }
            localStorage.setItem(app.historyStorageKey, JSON.stringify(allHistory));
        } catch (error) {
            console.error("Error saving session to history:", error);
        }
    }

    /**
     * NEW: Saves the best match time to localStorage.
     */
// ... existing code ... */
    function getDefaultDeck() {
        // MODIFIED: Return new deck object structure with settings
// ... existing code ... */
        } else if (mode === 'match') {
            dom.matchModeDisabled.classList.add('hidden');
        }


        // NEW: Update header title
        if (app.currentDeck.cards.length > 0 && mode !== 'create') {
            dom.headerTitle.textContent = app.currentDeck.title;
        } else if (mode === 'create') {
            dom.headerTitle.textContent = "Create a New Deck";
            renderCreateEditor(); // NEW: Render editor when switching to create
            app.isCreateDeckDirty = false; // Reset dirty flag when entering create mode
        } else {
            dom.headerTitle.textContent = "Totally Not Quizlet";
        }

        // ***** START PROGRESS RESET FIX *****
        const previousMode = app.currentMode; // Store the old mode
        
        // NEW: Hide progress bars if switching away
        if (previousMode === 'learn' && mode !== 'learn') {
            dom.learnProgressBarContainer.classList.add('hidden');
        }
        if (previousMode === 'type' && mode !== 'type') {
            dom.typeProgressBarContainer.classList.add('hidden');
        }

        app.currentMode = mode;
        dom.body.dataset.mode = mode;
        // ***** END PROGRESS RESET FIX *****

        dom.navButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // NEW: Create studyDeck *before* mode-specific logic
        // This ensures studyDeck is always up-to-date with settings
        if (app.currentDeck.cards.length > 0) {
            app.studyDeck = [...app.currentDeck.cards];
            if (app.currentDeck.settings.shuffle) {
                shuffleArray(app.studyDeck);
            }
        } else {
            app.studyDeck = [];
        }


        if (mode === 'flashcards') {
            // studyDeck is already created and shuffled (or not)
            
            // ***** START PROGRESS RESET FIX *****
            // Only reset the card index if we are coming from a DIFFERENT mode.
            // If we are just re-loading the flashcard view (e.g., from modal close),
            // keep the current index.
            if (previousMode !== 'flashcards') {
                app.currentCardIndex = 0;
            }
            // *Always* render and reset the flip state, just don't reset the index.
            // ***** END PROGRESS RESET FIX *****
            
            renderFlashcardContent();
            dom.flashcardContainer.classList.remove('is-flipped');
        } else if (mode === 'learn') {
            // Now that studyDeck is ready, start learn mode
            // This check is needed again in case the mode was set programmatically
            if (app.currentDeck.cards.length >= 4) {
                 // MODIFIED: Check for saved session vs. new session
                 if (app.learnSessionCards.length === 0) {
                    startLearnMode(); // Starts a new session
                 } else {
                    // A session is in progress, just resume.
                    dom.learnModeQuiz.classList.remove('hidden'); // Ensure quiz is visible
                    dom.learnCompleteView.classList.add('hidden'); // Ensure complete is hidden
                    dom.learnProgressBarContainer.classList.remove('hidden'); // Ensure bar is visible
                    renderLearnQuestion(); // Render the first card from the saved session
                 }
            }
        // NEW: Start type mode
        } else if (mode === 'type') {
            if (app.currentDeck.cards.length >= 1) {
                // MODIFIED: Check for saved session vs. new session
                if (app.typeSessionCards.length === 0) {
                    startTypeMode(); // Starts a new session
                } else {
                    // A session is in progress, just resume.
                    dom.typeModeQuiz.classList.remove('hidden'); // Ensure quiz is visible
                    dom.typeCompleteView.classList.add('hidden'); // Ensure complete is hidden
                    dom.typeProgressBarContainer.classList.remove('hidden'); // Ensure bar is visible
                    renderTypeQuestion(); // Render the first card from the saved session
                }
            }
        // NEW: Start match mode
        } else if (mode === 'match') {
            if (app.currentDeck.cards.length >= 2) {
                // MODIFIED: Handle preserving state vs. starting new
                if (previousMode !== 'match') {
                    startMatchMode(); // This will show the start screen
                }
            }
        } else if (mode === 'progress') { // NEW: Handle progress view
            renderProgressView();
        }
    }

    /**
// ... existing code ... */
    function addEventListeners() {
        // NEW: Theme toggle
        dom.themeToggleButton.addEventListener('click', toggleTheme);

        // Mode navigation
        dom.navButtons.forEach(button => {
            button.addEventListener('click', () => setMode(button.dataset.mode));
        });

        // Flashcard controls
        // MODIFIED: Replaced original click listener to handle both
        // flipping and TTS button clicks.
        dom.flashcardContainer.addEventListener('click', (e) => {
            // Check for TTS button click
            const ttsButton = e.target.closest('.tts-button');
            if (ttsButton) {
                e.stopPropagation(); // Prevent the card from flipping
                const cardFace = e.target.closest('.card-face');
                if (cardFace) {
                    const textToSpeak = cardFace.querySelector('p').textContent;
                    if (textToSpeak) {
                        speakText(textToSpeak);
                    }
                }
            } 
            // Check for flip click
            else if (!app.isAnimating) { // Don't flip while fading
                dom.flashcardContainer.classList.toggle('is-flipped');
            }
        });

        dom.prevCardButton.addEventListener('click', showPrevCard);
        dom.nextCardButton.addEventListener('click', showNextCard);

        // NEW: Swipe navigation for flashcards
        dom.flashcardContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
        dom.flashcardContainer.addEventListener('touchmove', handleTouchMove, { passive: true });
        dom.flashcardContainer.addEventListener('touchend', handleTouchEnd);
        
        // MODIFIED: Global keydown listener
        document.addEventListener('keydown', handleGlobalKeydown);

        // Create deck controls (MODIFIED)
        dom.parseDeckButton.addEventListener('click', parseAndLoadDeck);
        dom.addCardButton.addEventListener('click', () => {
            createNewCardRow();
            app.isCreateDeckDirty = true; // NEW
        });
        dom.toggleManualButton.addEventListener('click', () => setCreateMode('manual'));
        dom.togglePasteButton.addEventListener('click', () => setCreateMode('paste'));

        // NEW: Event delegation for delete buttons and auto-resize
        dom.cardEditorList.addEventListener('click', (e) => {
            if (e.target.closest('.delete-card-button')) {
                const row = e.target.closest('.card-editor-row');
                row.remove();
                updateCardRowNumbers();
                app.isCreateDeckDirty = true; // NEW
            }
        });

        dom.cardEditorList.addEventListener('input', (e) => {
            if (e.target.tagName === 'TEXTAREA') {
                autoResizeTextarea(e.target);
                app.isCreateDeckDirty = true; // NEW
            }
        });

        // NEW: Listen for changes on title and paste area
        dom.deckTitleInput.addEventListener('input', () => { app.isCreateDeckDirty = true; });
        dom.deckInputArea.addEventListener('input', () => { app.isCreateDeckDirty = true; });

        // NEW: Drag and Drop Listeners
        dom.cardEditorList.addEventListener('dragstart', handleDragStart);
        dom.cardEditorList.addEventListener('dragover', handleDragOver);
        dom.cardEditorList.addEventListener('drop', handleDrop);
        dom.cardEditorList.addEventListener('dragend', handleDragEnd);
        
        // Share button
        dom.shareDeckButton.addEventListener('click', shareDeck);

        // NEW: About Modal Listeners
        dom.aboutButton.addEventListener('click', showAboutModal);
        dom.aboutModalClose.addEventListener('click', hideAboutModal);
        dom.aboutModalBackdrop.addEventListener('click', hideAboutModal);

        // NEW: Settings Modal Listeners
        dom.settingsButton.addEventListener('click', showSettingsModal);
        dom.settingsModalClose.addEventListener('click', hideSettingsModal);
        dom.settingsModalBackdrop.addEventListener('click', hideSettingsModal);
        dom.settingDeckTitle.addEventListener('input', handleTitleSettingChange);
        dom.settingToggleShuffle.addEventListener('click', handleShuffleSettingChange);
        dom.settingToggleStartWith.addEventListener('click', handleStartWithSettingChange);
        dom.copyDeckButton.addEventListener('click', copyDeckTerms); // NEW
    
        // NEW: Learn Complete Listeners
        // MODIFIED: Added check for null in case element doesn't exist
        if (dom.learnRestartButton) {
            dom.learnRestartButton.addEventListener('click', startLearnMode);
        }
        if (dom.learnSwitchModeButton) {
            // MODIFIED: Changed to 'match'
            dom.learnSwitchModeButton.addEventListener('click', () => setMode('match'));
        }
        
        // NEW: Continue button listener (MODIFIED for timer)
        if (dom.learnContinueButton) {
            dom.learnContinueButton.addEventListener('click', () => {
                if (app.correctAnswerTimeout) { // Clear auto-advance timer
                    clearTimeout(app.correctAnswerTimeout);
                    app.correctAnswerTimeout = null;
                }
                renderLearnQuestion(); // Advance manually
            });
        }

        // NEW: Type Mode Listeners
        // MODIFIED: Added checks for null to prevent script crash
        if (dom.typeInputForm) {
            dom.typeInputForm.addEventListener('submit', handleTypeAnswer);
        }
        if (dom.typeSubmitButton) {
            dom.typeSubmitButton.addEventListener('click', handleTypeAnswer);
        }
        if (dom.typeOverrideWrongButton) {
            dom.typeOverrideWrongButton.addEventListener('click', handleTypeOverrideWrong);
        }
        if (dom.typeOverrideCorrectButton) {
            dom.typeOverrideCorrectButton.addEventListener('click', handleTypeOverrideCorrect);
        }
        if (dom.typeRestartButton) {
            dom.typeRestartButton.addEventListener('click', startTypeMode);
        }
        if (dom.typeSwitchModeButton) {
            // MODIFIED: Changed to 'flashcards'
            dom.typeSwitchModeButton.addEventListener('click', () => setMode('flashcards'));
        }
        
        // NEW: Continue button listener (MODIFIED for timer)
        if (dom.typeContinueButton) {
            dom.typeContinueButton.addEventListener('click', () => {
                if (app.correctAnswerTimeout) { // Clear auto-advance timer
                    clearTimeout(app.correctAnswerTimeout);
                    app.correctAnswerTimeout = null;
                }
                renderTypeQuestion(); // Advance manually
            });
        }

        // NEW: Match Mode Listeners
        if (dom.matchRestartButton) {
            dom.matchRestartButton.addEventListener('click', startMatchMode);
        }
        if (dom.matchStartButton) { // NEW
            dom.matchStartButton.addEventListener('click', startMatchRound);
        }
        if (dom.matchGameArea) {
            dom.matchGameArea.addEventListener('click', handleMatchClick);
        }

        // NEW: Clear All Button Listeners
        dom.clearCreateButton.addEventListener('click', showClearConfirmModal);
        dom.clearCancelButton.addEventListener('click', hideClearConfirmModal);
        dom.clearConfirmButton.addEventListener('click', handleClearAll);

        // NEW: Unsaved Changes Modal Listeners
        dom.unsavedCancelButton.addEventListener('click', hideUnsavedChangesModal);
        dom.unsavedDiscardButton.addEventListener('click', () => {
            hideUnsavedChangesModal();
            app.isCreateDeckDirty = false; // Discard changes
            setMode(app.pendingModeChange);
            app.pendingModeChange = null;
        });
        dom.unsavedSaveButton.addEventListener('click', () => {
            const success = parseAndLoadDeck(); // This now returns true/false
            if (success) {
                hideUnsavedChangesModal();
                // parseAndLoadDeck no longer reloads, so we must manually change mode
                setMode(app.pendingModeChange); 
                app.pendingModeChange = null;
            }
            // If not successful, modal stays open and parseAndLoadDeck shows its own error toast
        });
    }

    /**
// ... existing code ... */
    function updateCardProgress(card, wasCorrect) {
        const now = Date.now();
        card.lastReviewed = now;

        if (wasCorrect) {
            card.score = Math.min(card.score + 1, 5);
            card.nextReview = now + SRS_INTERVALS[card.score];
        } else {
            card.score = 0;
            card.nextReview = now + INCORRECT_INTERVAL;
        }
        
        // Find the card in the *main* deck and update it, ensuring progress persists
        const mainDeckCard = app.currentDeck.cards.find(c => c.id === card.id);
        if (mainDeckCard) {
            mainDeckCard.score = card.score;
            mainDeckCard.lastReviewed = card.lastReviewed;
            mainDeckCard.nextReview = card.nextReview;
        }

        // Note: This function doesn't save, as it's often called in a batch.
        // The calling function (e.g., handleLearnAnswer) should save.
    }


    // --- FLASHCARD MODE ---

// ... existing code ... */
    function startLearnMode() {
        // MODIFIED: Use studyDeck
        if (app.studyDeck.length < 4) return;
        dom.learnFeedbackContainer.classList.add('hidden'); // MODIFIED
        dom.learnCompleteView.classList.add('hidden'); // NEW: Hide complete view
        dom.learnModeQuiz.classList.remove('hidden'); // NEW: Show quiz view
        dom.learnProgressBarContainer.classList.remove('hidden'); // NEW
        
        app.learnSessionCards = [...app.studyDeck]; // NEW: Create session list
        shuffleArray(app.learnSessionCards); // NEW: Shuffle session list
        
        // NEW: Initialize session stats
        app.currentSessionStats = {
            missedCards: new Set(),
            totalCards: app.learnSessionCards.length,
            mode: 'learn'
        };
        
        updateProgressBar('learn'); // NEW
        renderLearnQuestion();
// ... existing code ... */
    function renderLearnQuestion() {
        // NEW: Clear any pending auto-advance
        if (app.correctAnswerTimeout) {
            clearTimeout(app.correctAnswerTimeout);
            app.correctAnswerTimeout = null;
        }

        updateProgressBar('learn'); // NEW

        // NEW: Hide continue button
        dom.learnContinueButton.classList.add('hidden');
        
        // NEW: Check for completion
        if (app.learnSessionCards.length === 0) {
            dom.learnModeQuiz.classList.add('hidden');
            dom.learnCompleteView.classList.remove('hidden');
            dom.learnProgressBarContainer.classList.add('hidden'); // NEW: Hide on complete
            saveCurrentSessionStats(); // NEW: Save session stats
            saveSessionsToLocalStorage(); // NEW: Save empty session
            return;
        }
// ... existing code ... */
            dom.learnModeQuiz.classList.add('hidden');
            dom.learnCompleteView.classList.remove('hidden');
            saveCurrentSessionStats(); // NEW: Save session stats
            saveSessionsToLocalStorage(); // NEW: Save empty session
            return;
        }

        // NEW: Ensure quiz is visible and complete is hidden (for subsequent questions)
        dom.learnModeQuiz.classList.remove('hidden');
        dom.learnCompleteView.classList.add('hidden');
        
        // MODIFIED: Get card from session list
        const card = app.learnSessionCards[0];
        if (!card) {
            // This case should be handled by the check above, but good to have.
            dom.learnModeQuiz.classList.add('hidden');
            dom.learnCompleteView.classList.remove('hidden');
            saveSessionsToLocalStorage(); // NEW: Save empty session
            return;
        }

        app.currentLearnCard = card;
        const options = generateQuizOptions(card);

        // NEW: Respect termFirst setting for the question
        dom.learnTerm.textContent = app.currentDeck.settings.termFirst ? card.term : card.definition;
        
        dom.learnOptions.innerHTML = ''; 
        
        dom.learnFeedbackContainer.classList.add('hidden'); // MODIFIED
        dom.learnFeedback.classList.remove('correct', 'incorrect');
        dom.learnFeedbackMessage.textContent = ''; // MODIFIED: Clear message

        options.forEach(option => {
            const button = document.createElement('button');
            // MODIFIED: Added rounded-xl, kept layout classes
            button.className = 'learn-option p-4 rounded-xl border text-left';
            button.textContent = option;
            button.dataset.answer = option;
            button.addEventListener('click', handleLearnAnswer);
            dom.learnOptions.appendChild(button);
        });
    }

    function getNextLearnCard() {
        const now = Date.now();
        // MODIFIED: Use studyDeck
        // Note: This filters the *studyDeck*, which is a copy. Progress is saved
        // to the original cards in app.currentDeck.cards, so this works.
        const dueCards = app.studyDeck.filter(card => card.nextReview <= now);

        if (dueCards.length > 0) {
            dueCards.sort((a, b) => a.score - b.score);
            return dueCards[0];
        }

        // MODIFIED: Use studyDeck
        const allCardsSorted = [...app.studyDeck].sort((a, b) => a.score - b.score);
        return allCardsSorted[0];
    }

    /**
     * *** MODIFIED: This function now selects the 3 MOST SIMILAR distractors
     * *** based on Levenshtein distance to make the quiz more challenging.
     */
    function generateQuizOptions(correctCard) {
        const termFirst = app.currentDeck.settings.termFirst;
        
        // 1. Determine the correct answer text
        const correctOption = termFirst ? correctCard.definition : correctCard.term;
        const textToCompare = correctOption.toLowerCase(); 

        // 2. Create a pool of distractors, excluding the correct card
        const distractorPool = app.studyDeck.filter(card => card.id !== correctCard.id);

        // 3. Calculate Levenshtein distance for each distractor
        const distractorsWithDistance = distractorPool.map(card => {
            const distractorOption = termFirst ? card.definition : card.term;
            const distance = levenshteinDistance(distractorOption.toLowerCase(), textToCompare);
            
            return {
                optionText: distractorOption,
                distance: distance
            };
        });

        // 4. Sort distractors by distance (closest first)
        distractorsWithDistance.sort((a, b) => a.distance - b.distance);

        // 5. Build the final options list, prioritizing closest
        const finalOptions = [correctOption];
        const addedOptions = new Set();
        addedOptions.add(correctOption);

        // 6. Add the closest unique distractors
        for (const distractor of distractorsWithDistance) {
            if (finalOptions.length >= 4) {
                break; // We have enough
            }
            if (!addedOptions.has(distractor.optionText)) {
                finalOptions.push(distractor.optionText);
                addedOptions.add(distractor.optionText);
            }
        }

        // 7. If we still don't have 4 (e.g., small deck), fill with randoms
        if (finalOptions.length < 4) {
            const shuffledPool = [...distractorPool]; // Clone and shuffle
            shuffleArray(shuffledPool);
            
            for (const card of shuffledPool) {
                if (finalOptions.length >= 4) {
                    break;
                }
                const randomOption = termFirst ? card.definition : card.term;
                if (!addedOptions.has(randomOption)) {
                    finalOptions.push(randomOption);
                    addedOptions.add(randomOption);
                }
            }
        }
        
        // 8. Final shuffle of positions
        shuffleArray(finalOptions);

        // Ensure we only return 4 options, even if something weird happened
        return finalOptions.slice(0, 4);
    }

    function handleLearnAnswer(event) {
        if (app.correctAnswerTimeout) { // Clear any existing timer
            clearTimeout(app.correctAnswerTimeout);
            app.correctAnswerTimeout = null;
        }

        const selectedButton = event.currentTarget;
        const selectedAnswer = selectedButton.dataset.answer;
        // NEW: Check correct answer based on termFirst
        const correctAnswer = app.currentDeck.settings.termFirst ? app.currentLearnCard.definition : app.currentLearnCard.term;
        const now = Date.now();

        dom.learnOptions.querySelectorAll('button').forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.answer === correctAnswer) {
                btn.classList.add('correct');
            } else if (btn === selectedButton) {
                btn.classList.add('incorrect');
            }
        });

        if (selectedAnswer === correctAnswer) {
            app.learnSessionCards.shift(); // NEW: Remove correct card from session
            updateCardProgress(app.currentLearnCard, true); // MODIFIED
            dom.learnFeedbackMessage.textContent = "Correct!";
            dom.learnFeedback.classList.add('correct');
            dom.learnFeedback.classList.remove('incorrect');
            
            // NEW: Start auto-advance timer
            app.correctAnswerTimeout = setTimeout(renderLearnQuestion, CORRECT_ANSWER_DELAY);
        } else {
            app.learnSessionCards.push(app.learnSessionCards.shift()); // NEW: Move incorrect card to back
            updateCardProgress(app.currentLearnCard, false); // MODIFIED
            // MODIFIED: Show the correct answer in the feedback
            dom.learnFeedbackMessage.textContent = "Incorrect. The correct answer is: " + correctAnswer;
            dom.learnFeedback.classList.add('incorrect');
            dom.learnFeedback.classList.remove('correct');
            // NEW: No timer for incorrect answers

            // NEW: Track missed card
            if (app.currentSessionStats) {
                app.currentSessionStats.missedCards.add(app.currentLearnCard.id);
            }
        }
        
        // Note: app.currentLearnCard is an object from the studyDeck, but it's
        // a reference to the *same object* in app.currentDeck.cards,
        // so progress updates correctly.
        dom.learnFeedbackContainer.classList.remove('hidden'); // MODIFIED
        dom.learnContinueButton.classList.remove('hidden'); // NEW: Show continue button

        saveProgressToLocalStorage();
        saveSessionsToLocalStorage(); // NEW: Save session progress
        // MODIFIED: Removed setTimeout to wait for user input
    }

    // --- NEW: TYPE MODE ---

    /**
     * Starts a new "Type" mode session.
     */
    function startTypeMode() {
        if (app.studyDeck.length < 1) return; // Need at least 1 card
        
        dom.typeFeedbackContainer.classList.add('hidden'); // MODIFIED
        dom.typeCompleteView.classList.add('hidden');
        dom.typeModeQuiz.classList.remove('hidden');
        dom.typeProgressBarContainer.classList.remove('hidden'); // NEW
        
        app.typeSessionCards = [...app.studyDeck]; // Create session list
        shuffleArray(app.typeSessionCards); // Shuffle session list
        
        // NEW: Initialize session stats
        app.currentSessionStats = {
            missedCards: new Set(),
            totalCards: app.typeSessionCards.length,
            mode: 'type'
        };
        
        updateProgressBar('type'); // NEW
        renderTypeQuestion();
// ... existing code ... */
    function renderTypeQuestion() {
        // NEW: Clear any pending auto-advance
        if (app.correctAnswerTimeout) {
            clearTimeout(app.correctAnswerTimeout);
            app.correctAnswerTimeout = null;
        }

        updateProgressBar('type'); // NEW

        // NEW: Hide continue button
        dom.typeContinueButton.classList.add('hidden');
        
        // Check for completion
        if (app.typeSessionCards.length === 0) {
            dom.typeModeQuiz.classList.add('hidden');
            dom.typeCompleteView.classList.remove('hidden');
            dom.typeProgressBarContainer.classList.add('hidden'); // NEW: Hide on complete
            saveCurrentSessionStats(); // NEW: Save session stats
            saveSessionsToLocalStorage(); // NEW: Save empty session
            return;
        }

        // Ensure quiz is visible and complete is hidden
        dom.typeModeQuiz.classList.remove('hidden');
        dom.typeCompleteView.classList.add('hidden');
        
        app.currentTypeCard = app.typeSessionCards[0]; // Get card
        
        // Set question text (respects 'termFirst')
        const questionText = app.currentDeck.settings.termFirst 
            ? app.currentTypeCard.term 
            : app.currentTypeCard.definition;
        dom.typeQuestionTerm.textContent = questionText;
        
        // Reset inputs
        dom.typeInputArea.value = '';
        dom.typeInputArea.disabled = false;
        dom.typeSubmitButton.disabled = false;
        dom.typeInputArea.focus(); // NEW: Focus input
        dom.typeFeedbackContainer.classList.add('hidden'); // MODIFIED
        dom.typeFeedback.classList.remove('correct', 'incorrect', 'close'); // <-- THE FIX
        
        // MODIFIED: Explicitly clear feedback text
        dom.typeFeedbackMessage.textContent = '';
        dom.typeFeedbackCorrectAnswer.textContent = '';
        
        dom.typeOverrideWrongButton.classList.add('hidden'); 
        dom.typeOverrideCorrectButton.classList.add('hidden'); 
    } 

    /**
     * Handles the user submitting a typed answer.
     */
    function handleTypeAnswer(e) {
        if (e) e.preventDefault(); // Stop form submission
        if (dom.typeInputArea.disabled) return; // Prevent double-submit

        // NEW: Clear any pending auto-advance
        if (app.correctAnswerTimeout) {
            clearTimeout(app.correctAnswerTimeout);
            app.correctAnswerTimeout = null;
        }

        const userAnswer = dom.typeInputArea.value.trim();
        if (!userAnswer) return; // Don't submit empty answers

        const correctAnswer = app.currentDeck.settings.termFirst
            ? app.currentTypeCard.definition
            : app.currentTypeCard.term;

        // Compare case-insensitively
        const distance = levenshteinDistance(userAnswer.toLowerCase(), correctAnswer.toLowerCase());

        // Disable inputs
        dom.typeInputArea.disabled = true;
        dom.typeSubmitButton.disabled = true;
        dom.typeFeedbackContainer.classList.remove('hidden'); // MODIFIED
        dom.typeFeedback.classList.remove('correct', 'incorrect', 'close'); // MODIFIED
        dom.typeOverrideWrongButton.classList.add('hidden'); // MODIFIED
        dom.typeOverrideCorrectButton.classList.add('hidden'); // NEW

        if (distance === 0) {
            // --- Perfect Match ---
            dom.typeFeedback.classList.add('correct');
            dom.typeFeedbackMessage.textContent = "Correct!";
            dom.typeFeedbackCorrectAnswer.textContent = '';
            
            updateCardProgress(app.currentTypeCard, true);
            app.typeSessionCards.shift(); // Remove from session

            // NEW: Start auto-advance timer (1 second)
            app.correctAnswerTimeout = setTimeout(renderTypeQuestion, CORRECT_ANSWER_DELAY);

        } else if (distance <= TYPE_CLOSE_THRESHOLD) {
            // --- Close Match ---
            dom.typeFeedback.classList.add('close');
            dom.typeFeedbackMessage.textContent = "Close!";
            dom.typeFeedbackCorrectAnswer.textContent = `Correct answer: ${correctAnswer}`;
            dom.typeOverrideWrongButton.classList.remove('hidden'); // MODIFIED

            // Assume correct, but cache the card in case of override
            updateCardProgress(app.currentTypeCard, true);
            app.lastTypeCard = app.typeSessionCards.shift(); // Remove and store

            // *** MODIFIED *** Start auto-advance timer (3 seconds)
            app.correctAnswerTimeout = setTimeout(renderTypeQuestion, CLOSE_ANSWER_DELAY);

        } else {
            // --- Incorrect Match ---
            dom.typeFeedback.classList.add('incorrect');
            dom.typeFeedbackMessage.textContent = "Incorrect.";
            dom.typeFeedbackCorrectAnswer.textContent = `Correct answer: ${correctAnswer}`;
            dom.typeOverrideCorrectButton.classList.remove('hidden'); // NEW
            
            updateCardProgress(app.currentTypeCard, false);
            // MODIFIED: Store card *before* moving it
            app.lastTypeCard = app.typeSessionCards.shift(); // Remove and store
            app.typeSessionCards.push(app.lastTypeCard); // Move to back

            // NEW: Track missed card
            if (app.currentSessionStats) {
                app.currentSessionStats.missedCards.add(app.lastTypeCard.id);
            }

            // NEW: No timer for incorrect answers
        }

        saveProgressToLocalStorage();
        saveSessionsToLocalStorage(); // NEW: Save session progress
        
        // MODIFIED: Show continue button instead of using timeout
        dom.typeContinueButton.classList.remove('hidden');
    }

    /**
     * MODIFIED: Handles the "I got it wrong" override button.
     */
    function handleTypeOverrideWrong() {
        if (!app.lastTypeCard) return; // No card to override

        // 1. Re-add the card to the end of the session
        app.typeSessionCards.push(app.lastTypeCard);

        // 2. Mark the card as incorrect (resets score)
// ... existing code ... */
        updateCardProgress(app.lastTypeCard, false);
        saveProgressToLocalStorage();
        saveSessionsToLocalStorage(); // NEW: Save session progress

        // NEW: Track missed card
        if (app.currentSessionStats) {
            app.currentSessionStats.missedCards.add(app.lastTypeCard.id);
        }

        // 3. Clear the cache and hide the button
        app.lastTypeCard = null;
        dom.typeOverrideWrongButton.classList.add('hidden');

        // 4. Give feedback
        showToast("Got it. We'll ask that one again.");
    }

/**
 * NEW: Handles the "I got it correct" override button.
 */
    function handleTypeOverrideCorrect() {
        if (!app.lastTypeCard) return; // No card to override

        // 1. Update progress to correct
        updateCardProgress(app.lastTypeCard, true);
        saveProgressToLocalStorage();

        // 2. The card is at the end of the session array. Find and remove it.
        const cardIndex = app.typeSessionCards.lastIndexOf(app.lastTypeCard);
        if (cardIndex > -1) {
            app.typeSessionCards.splice(cardIndex, 1);
        }
        
        // NEW: If this was a missed card, remove it from the set
        if (app.currentSessionStats) {
            app.currentSessionStats.missedCards.delete(app.lastTypeCard.id);
        }
        
        saveSessionsToLocalStorage(); // NEW: Save session progress
// ... existing code ... */
    function startMatchRound() {
        // Hide start screen, show game
        dom.matchStartScreen.classList.add('hidden');
        dom.matchModeGame.classList.remove('hidden');
        dom.matchCompleteView.classList.add('hidden');

        // Clear any existing timer
// ... existing code ... */
        app.selectedDef = null;
        app.isCheckingMatch = false;

        // Get cards for this round
        const roundCards = app.matchSessionCards.slice(0, MATCH_ROUND_SIZE);
        app.matchItemsLeft = roundCards.length;

        // NEW: Initialize session stats *only for the first round*
        if (app.matchSessionCards.length === app.studyDeck.length) {
            app.currentSessionStats = {
                missedCards: new Set(),
                totalCards: app.studyDeck.length, // Track total deck
                mode: 'match',
                startTime: Date.now() // Track start time for final score
            };
        }
        
        // Check if there are enough cards to play
        if (app.matchItemsLeft < 2) {
            dom.matchModeGame.classList.add('hidden');
            dom.matchCompleteView.classList.remove('hidden');
            // This case handles finishing the entire set
            return;
        }

        // Prepare lists
        let termItems = [];
        let defItems = [];

        for (const card of roundCards) {
            // Use card.id to link term and definition
            termItems.push(`<div class="match-item" data-id="${card.id}">${card.term}</div>`);
            defItems.push(`<div class="match-item" data-id="${card.id}">${card.definition}</div>`);
        }

        // Shuffle lists independently
        shuffleArray(termItems);
        shuffleArray(defItems);

        // Populate HTML
        dom.matchTermsList.innerHTML = termItems.join('');
        dom.matchDefsList.innerHTML = defItems.join('');

        // Start timer
        app.matchStartTime = Date.now();
        dom.matchTimer.textContent = '0.0s';
        app.matchTimerInterval = setInterval(updateMatchTimer, 100);
    }

    /**
     * Updates the match timer display.
     */
    function updateMatchTimer() {
        const elapsed = (Date.now() - app.matchStartTime) / 1000;
        dom.matchTimer.textContent = `${elapsed.toFixed(1)}s`;
    }

    /**
     * Handles clicks within the match game area.
     */
    function handleMatchClick(e) {
        const item = e.target.closest('.match-item');

        // Ignore if already matched, during an incorrect-check, or not a match item
        if (!item || item.classList.contains('correct') || app.isCheckingMatch) {
            return;
        }

        const list = item.parentElement;

        if (list.id === 'match-terms-list') {
            // Clicked on a term
            if (app.selectedTerm) {
                app.selectedTerm.classList.remove('selected');
            }
            app.selectedTerm = item;
            item.classList.add('selected');

        } else if (list.id === 'match-defs-list') {
            // Clicked on a definition
            if (app.selectedDef) {
                app.selectedDef.classList.remove('selected');
            }
            app.selectedDef = item;
            item.classList.add('selected');
        }

        // If both a term and a definition are selected, check the match
        if (app.selectedTerm && app.selectedDef) {
            checkMatch();
        }
    }

    /**
     * Checks if the selected term and definition match.
     */
    function checkMatch() {
        app.isCheckingMatch = true; // Lock clicking
        const term = app.selectedTerm;
        const def = app.selectedDef;
        const cardId = term.dataset.id;

        // Find the card in the session
        const cardIndex = app.matchSessionCards.findIndex(c => c.id === cardId);
        const card = cardIndex > -1 ? app.matchSessionCards[cardIndex] : null;

        if (term.dataset.id === def.dataset.id) {
            // --- CORRECT MATCH ---
            term.classList.remove('selected');
            def.classList.remove('selected');
            term.classList.add('correct');
            def.classList.add('correct');

            app.matchItemsLeft--;
            
            if (card) {
                updateCardProgress(card, true);
                app.matchSessionCards.splice(cardIndex, 1); // Remove from session
            }

            // Check if round is complete
            if (app.matchItemsLeft === 0) {
                clearInterval(app.matchTimerInterval);
                app.matchTimerInterval = null; // NEW: Clear interval ID
                saveProgressToLocalStorage();

                // NEW: Best Time Logic
                const finalTime = (Date.now() - app.matchStartTime) / 1000;
                if (finalTime < app.matchBestTime) {
                    app.matchBestTime = finalTime;
                    saveBestTimeToLocalStorage();
// ... existing code ... */
                } else {
                    // No more cards, show final complete screen
                    setTimeout(() => {
                        dom.matchModeGame.classList.add('hidden');
                        dom.matchCompleteView.classList.remove('hidden');
                        app.currentSessionStats.endTime = Date.now(); // NEW: Mark end time
                        saveCurrentSessionStats(); // NEW: Save session
                    }, 1000); // Wait 1 sec
                }
            }
            
            app.isCheckingMatch = false; // Unlock

        } else {
            // --- INCORRECT MATCH ---
            term.classList.remove('selected');
            def.classList.remove('selected');
            term.classList.add('incorrect');
            def.classList.add('incorrect');

            if (card) {
                updateCardProgress(card, false);
                // Move card to the end of the session
                app.matchSessionCards.push(app.matchSessionCards.splice(cardIndex, 1)[0]);
                
                // NEW: Track missed card
                if (app.currentSessionStats) {
                    app.currentSessionStats.missedCards.add(card.id);
                }
            }
            
            saveProgressToLocalStorage();

            // Reset after a delay
            setTimeout(() => {
                term.classList.remove('incorrect');
                def.classList.remove('incorrect');
                app.isCheckingMatch = false; // Unlock
            }, MATCH_INCORRECT_DELAY);
        }

        // Reset selections
        app.selectedTerm = null;
        app.selectedDef = null;
    }

    // --- END MATCH MODE ---

    // --- NEW: PROGRESS VIEW ---

    /**
     * Renders all data for the Progress tab.
     */
    function renderProgressView() {
        if (app.currentDeck.cards.length === 0) {
            // Handle case where user switches to progress on an empty deck
            // This is unlikely but good to guard against.
            return;
        }

        // 1. Calculate and Render Mastery
        const masteryStats = { mastered: 0, learning: 0, notLearned: 0 };
        for (const card of app.currentDeck.cards) {
            if (card.score >= 3) {
                masteryStats.mastered++;
            } else if (card.score > 0) {
                masteryStats.learning++;
            } else {
                masteryStats.notLearned++;
            }
        }
        dom.masteryMastered.textContent = masteryStats.mastered;
        dom.masteryLearning.textContent = masteryStats.learning;
        dom.masteryNotLearned.textContent = masteryStats.notLearned;

        // 2. Load History
        const allHistory = loadHistoryFromLocalStorage();
        const deckHistory = allHistory[app.currentDeckHash] || [];

        // 3. Render Latest Session & Pie Chart
        if (deckHistory.length > 0) {
            const latestSession = deckHistory[0];
            renderProgressPieChart(latestSession);
            
            // Render text stats
            dom.latestSessionStats.innerHTML = `
                <div class="stat-item">
                    <span class="stat-value">${latestSession.mode.charAt(0).toUpperCase() + latestSession.mode.slice(1)}</span>
                    <div class="stat-label">Last Mode</div>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${latestSession.firstTry} / ${latestSession.totalCards}</span>
                    <div class="stat-label">First Try</div>
                </div>
                ${latestSession.timeTaken ? `
                <div class="stat-item">
                    <span class="stat-value">${(latestSession.timeTaken / 1000).toFixed(1)}s</span>
                    <div class="stat-label">Time Taken</div>
                </div>` : ''}
            `;
            
            dom.progressNoSession.classList.add('hidden');
            dom.progressSessionContainer.classList.remove('hidden');
        } else {
            dom.progressNoSession.classList.remove('hidden');
            dom.progressSessionContainer.classList.add('hidden');
        }

        // 4. Render Session History List
        if (deckHistory.length > 0) {
            dom.progressHistoryList.innerHTML = deckHistory.map(session => {
                const date = new Date(session.timestamp).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                });
                return `
                    <li class="history-list-item">
                        <div class="info">
                            <div class="mode">${session.mode}</div>
                            <div class="date">${date}</div>
                        </div>
                        <div class="score">
                            <span class="correct">${session.firstTry}</span>
                            <span class="total"> / ${session.totalCards}</span>
                        </div>
                    </li>
                `;
            }).join('');
            dom.progressNoHistory.classList.add('hidden');
            dom.progressHistoryList.classList.remove('hidden');
        } else {
            dom.progressNoHistory.classList.remove('hidden');
            dom.progressHistoryList.classList.add('hidden');
        }
    }

    /**
     * Renders the pie chart for the latest session.
     * @param {object} session - The session object to render.
     */
    function renderProgressPieChart(session) {
        if (app.progressChartInstance) {
            app.progressChartInstance.destroy();
        }

        // Get theme-aware colors
        const computedStyles = getComputedStyle(document.body);
        const colorCorrect = computedStyles.getPropertyValue('--color-mastered').trim() || '#38c172';
        const colorLearning = computedStyles.getPropertyValue('--color-learning').trim() || '#ffcd1f';
        const colorText = computedStyles.getPropertyValue('--color-text-secondary').trim() || '#a0aec0';

        app.progressChartInstance = new Chart(dom.progressPieChart, {
            type: 'doughnut',
            data: {
                labels: ['First Try', 'Took Longer'],
                datasets: [{
                    label: 'Session Stats',
                    data: [session.firstTry, session.tookLonger],
                    backgroundColor: [
                        colorCorrect,
                        colorLearning
                    ],
                    borderColor: computedStyles.getPropertyValue('--color-card-bg').trim(),
                    borderWidth: 4,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: colorText,
                            font: {
                                weight: '600'
                            }
                        }
                    },
                    tooltip: {
                        titleFont: { weight: 'bold' },
                        bodyFont: { weight: '600' },
                    }
                },
                cutout: '70%'
            }
        });
    }
    
    /**
     * Calculates and saves the stats for the just-completed session.
     */
    function saveCurrentSessionStats() {
        if (!app.currentSessionStats) return; // No session active

        const missedCount = app.currentSessionStats.missedCards.size;
        const firstTryCount = Math.max(0, app.currentSessionStats.totalCards - missedCount);

        const session = {
            timestamp: Date.now(),
            mode: app.currentSessionStats.mode,
            firstTry: firstTryCount,
            tookLonger: missedCount,
            totalCards: app.currentSessionStats.totalCards
        };

        // Add match-specific time
        if (session.mode === 'match' && app.currentSessionStats.endTime) {
            session.timeTaken = app.currentSessionStats.endTime - app.currentSessionStats.startTime;
        }

        saveSessionToHistory(session);

        // Clear the stats for the next run
        app.currentSessionStats = null;
    }

    // --- END PROGRESS VIEW ---

    // --- CREATE DECK ---

    /**
// ... existing code ... */
    function autoResizeTextarea(textarea) {
        textarea.style.height = 'auto'; // Reset height
// ... existing code ... */
