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
        currentMode: 'flashcards', // 'flashcards', 'learn', 'type', 'match', 'create', 'empty', 'options', 'sessionSummary'
        currentLearnCard: null,
        currentTypeCard: null, // NEW
        lastTypeCard: null, // NEW: For the override button
        
        // NEW: Session Timing
        sessionStartTime: 0,
        sessionEndTime: 0,
        sessionDuration: 0,

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
        sessionHistoryKey: 'flashcardAppSessionHistory', // NEW: For persistent session stats
        
        // NEW: Persistent history of study sessions
        sessionHistory: [], 
        
        // NEW: Session stats for the summary view
        currentSessionStats: {
            mode: '',
            duration: 0,
            totalCards: 0,
            firstTry: 0, // Number of cards mastered on first attempt
            reviewed: 0, // Number of cards that required review/took longer
            totalAttempts: 0,
            accuracy: 0, // Used for Type/Learn
            timeTaken: 0, // Used for Match
            deckHash: ''
        },

        // Other state variables...
        decks: [],
        currentDeckId: null,
        isCreateDeckDirty: false,
        isSettingsDirty: false,
        isDeckListDirty: false, 
        isDarkMode: true,
        draggedItem: null,
        chartInstance: null, // NEW: To hold the Chart.js instance
    };

    // --- DOM REFERENCES ---
    const dom = {
        // Main views
        appContainer: document.getElementById('app-container'),
        emptyView: document.getElementById('empty-view'),
        createView: document.getElementById('create-view'),
        optionsView: document.getElementById('options-view'),
        flashcardsView: document.getElementById('flashcards-view'),
        learnView: document.getElementById('learn-view'),
        typeView: document.getElementById('type-view'),
        matchView: document.getElementById('match-view'),
        sessionSummaryView: document.getElementById('session-summary-view'), // NEW

        // Buttons
        settingsButton: document.getElementById('settings-button'),
        createNewDeckButton: document.getElementById('create-new-deck-button'),
        flashcardsButton: document.getElementById('flashcards-button'),
        learnButton: document.getElementById('learn-button'),
        typeButton: document.getElementById('type-button'),
        matchButton: document.getElementById('match-button'),
        editDeckButton: document.getElementById('edit-deck-button'),
        deleteDeckButton: document.getElementById('delete-deck-button'),
        addCardButton: document.getElementById('add-card-button'),
        saveDeckButton: document.getElementById('save-deck-button'),
        cancelCreateButton: document.getElementById('cancel-create-button'),
        flashcardFlipButton: document.getElementById('flashcard-flip-button'),
        flashcardNextButton: document.getElementById('flashcard-next-button'),
        flashcardEndButton: document.getElementById('flashcard-end-button'),
        learnEndButton: document.getElementById('learn-end-button'),
        typeEndButton: document.getElementById('type-end-button'),
        matchEndButton: document.getElementById('match-end-button'),
        learnContinueButton: document.getElementById('learn-continue-button'),
        learnOverrideButton: document.getElementById('learn-override-button'),
        typeContinueButton: document.getElementById('type-continue-button'),
        typeOverrideButton: document.getElementById('type-override-button'),
        closeSettingsButton: document.getElementById('close-settings-button'),
        shuffleOnButton: document.getElementById('shuffle-on-button'),
        shuffleOffButton: document.getElementById('shuffle-off-button'),
        termFirstButton: document.getElementById('term-first-button'),
        defFirstButton: document.getElementById('def-first-button'),
        darkModeButton: document.getElementById('dark-mode-button'),
        lightModeButton: document.getElementById('light-mode-button'),
        clearAllConfirmButton: document.getElementById('clear-confirm-button'),
        clearAllCancelButton: document.getElementById('clear-cancel-button'),
        unsavedSaveButton: document.getElementById('unsaved-save-button'),
        unsavedDiscardButton: document.getElementById('unsaved-discard-button'),
        unsavedCancelButton: document.getElementById('unsaved-cancel-button'),

        // Display elements
        deckOptionsTitle: document.getElementById('deck-options-title'),
        deckTitleInput: document.getElementById('deck-title-input'),
        cardEditorList: document.getElementById('card-editor-list'),
        flashcardCardContainer: document.getElementById('flashcard-card-container'),
        flashcardProgress: document.getElementById('flashcard-progress'),
        learnCardDisplay: document.getElementById('learn-card-display'),
        learnTerm: document.getElementById('learn-term'),
        learnPrompt: document.getElementById('learn-prompt'),
        learnOptionsContainer: document.getElementById('learn-options-container'),
        learnFeedbackContainer: document.getElementById('learn-feedback-container'),
        learnFeedbackMessage: document.getElementById('learn-feedback-message'),
        learnCorrectAnswer: document.getElementById('learn-correct-answer'),
        learnProgressBar: document.getElementById('learn-progress-bar'),
        learnProgressText: document.getElementById('learn-progress-text'),
        typeCardDisplay: document.getElementById('type-card-display'),
        typeTerm: document.getElementById('type-term'),
        typePrompt: document.getElementById('type-prompt'),
        typeAnswerInput: document.getElementById('type-answer-input'),
        typeFeedbackContainer: document.getElementById('type-feedback-container'),
        typeFeedbackMessage: document.getElementById('type-feedback-message'),
        typeCorrectAnswer: document.getElementById('type-correct-answer'),
        typeProgressBar: document.getElementById('type-progress-bar'),
        typeProgressText: document.getElementById('type-progress-text'),
        matchTimer: document.getElementById('match-timer'),
        matchBestTime: document.getElementById('match-best-time'),
        matchItemsLeft: document.getElementById('match-items-left'),
        matchGameContainer: document.getElementById('match-game-container'),
        
        // Modals
        settingsModalOverlay: document.getElementById('settings-modal-overlay'),
        clearConfirmModalOverlay: document.getElementById('clear-confirm-modal-overlay'),
        unsavedChangesModalOverlay: document.getElementById('unsaved-changes-modal-overlay'),

        // NEW: Session Summary Elements
        summaryModeTitle: document.getElementById('summary-mode-title'),
        summaryBackButton: document.getElementById('summary-back-button'),
        sessionPieChart: document.getElementById('session-pie-chart'),
        chartTotalCards: document.getElementById('chart-total-cards'),
        summaryStatMode: document.getElementById('summary-stat-mode'),
        summaryStatTime: document.getElementById('summary-stat-time'),
        summaryStatFirstTry: document.getElementById('summary-stat-first-try'),
        summaryStatReviewed: document.getElementById('summary-stat-reviewed'),
        summaryStatAttempts: document.getElementById('summary-stat-attempts'),
        summaryStatAccuracy: document.getElementById('summary-stat-accuracy'),
        summaryHistoryMessage: document.getElementById('summary-history-message'),
        summaryHistoryModeName: document.getElementById('summary-history-mode-name'),
        summaryHistoryStats: document.getElementById('summary-history-stats'),
        summaryLastTime: document.getElementById('summary-last-time'),
        summaryLastFirstTry: document.getElementById('summary-last-first-try'),
        summaryImprovementScore: document.getElementById('summary-improvement-score'),
    };

    // --- PERSISTENCE (MODIFIED/NEW) ---

    // ... (loadSettings, saveSettings, loadMatchBestTime, saveMatchBestTime, loadDecks, saveDecks, loadProgress, saveProgress remain the same) ...

    /**
     * Loads the stored session history from localStorage.
     */
    function loadSessionHistory() {
        try {
            const historyJson = localStorage.getItem(app.sessionHistoryKey);
            if (historyJson) {
                app.sessionHistory = JSON.parse(historyJson);
            }
        } catch (e) {
            console.error("Could not load session history from localStorage:", e);
            app.sessionHistory = [];
        }
    }

    /**
     * Saves the current session history to localStorage.
     */
    function saveSessionHistory() {
        try {
            localStorage.setItem(app.sessionHistoryKey, JSON.stringify(app.sessionHistory));
        } catch (e) {
            console.error("Could not save session history to localStorage:", e);
        }
    }

    /**
     * Initializes the application state by loading data.
     */
    function initialize() {
        loadSettings();
        loadDecks();
        loadMatchBestTime();
        loadSessionHistory(); // NEW: Load session history
        loadCurrentDeckFromHash();
        
        // Initial view setup
        if (app.decks.length === 0) {
            showView('empty');
        } else if (app.currentDeck.cards.length > 0) {
            showView('options');
        } else {
            showView('create');
        }
        
        updateSettingsIconVisibility();
    }

    // --- UTILITIES (MODIFIED/NEW) ---

    /**
     * Formats duration in milliseconds to MM:SS or S.s format.
     * @param {number} ms - Duration in milliseconds.
     * @returns {string} Formatted time string.
     */
    function formatDuration(ms) {
        if (ms === Infinity) return '--';
        const totalSeconds = ms / 1000;
        if (totalSeconds < 60) {
            return `${totalSeconds.toFixed(1)}s`;
        }
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * Shows a specific application view and hides others.
     * @param {string} mode - The view mode.
     */
    function showView(mode) {
        app.currentMode = mode;
        const views = [dom.emptyView, dom.createView, dom.optionsView, dom.flashcardsView, dom.learnView, dom.typeView, dom.matchView, dom.sessionSummaryView]; // MODIFIED: Add summary view
        const targetView = dom[`${mode}View`];
        
        if (targetView) {
            views.forEach(view => {
                if (view === targetView) {
                    view.classList.remove('hidden');
                } else {
                    view.classList.add('hidden');
                }
            });
        }
        updateSettingsIconVisibility();
        
        // Match specific: Ensure timer is stopped when leaving match view
        if (mode !== 'match' && app.matchTimerInterval) {
            clearInterval(app.matchTimerInterval);
            app.matchTimerInterval = null;
        }
    }

    // --- SESSION START (MODIFIED) ---

    /**
     * Starts a new study session (Learn/Type).
     * @param {string} mode - 'learn' or 'type'.
     */
    function startStudySession(mode) {
        // ... (existing logic)
        app.currentCardIndex = 0;
        
        // Setup initial card array based on mode
        if (mode === 'learn') {
            app.learnSessionCards = initializeLearnDeck(app.studyDeck);
        } else if (mode === 'type') {
            app.typeSessionCards = initializeTypeDeck(app.studyDeck);
        }

        // NEW: Start session timer
        app.sessionStartTime = Date.now(); 

        showView(mode);
        // ... (rest of existing logic)
        
        if (mode === 'learn') {
            nextLearnCard();
        } else if (mode === 'type') {
            nextTypeCard();
        }
    }

    // ... (initializeLearnDeck, initializeTypeDeck, startFlashcardsSession, startMatchSession remain the same) ...

    // --- SESSION END (MODIFIED) ---

    /**
     * Finishes the Learn session, calculates stats, and shows summary.
     */
    function finishLearnSession() {
        app.sessionEndTime = Date.now();
        const duration = app.sessionEndTime - app.sessionStartTime;

        // Calculate Learn stats: count cards mastered on the first attempt (score > 1 initially)
        const totalCards = app.learnSessionCards.length;
        let firstTry = 0;
        let reviewed = 0;

        app.learnSessionCards.forEach(card => {
            // Learn mode's logic tracks successful first-time mastery by the initial score being > 0
            if (card.initialScore > 0) {
                firstTry++; 
            } else {
                reviewed++; 
            }
        });
        const totalAttempts = totalCards; // Total unique cards attempted

        app.currentSessionStats = {
            mode: 'Learn',
            duration: duration,
            totalCards: totalCards,
            firstTry: firstTry,
            reviewed: reviewed,
            totalAttempts: totalAttempts,
            accuracy: (firstTry / totalCards) * 100, // First-try success rate
            timeTaken: duration,
            deckHash: app.currentDeckHash
        };

        saveSessionResult(); // NEW: Save the result
        showSessionSummary();
    }


    /**
     * Finishes the Type session, calculates stats, and shows summary.
     */
    function finishTypeSession() {
        app.sessionEndTime = Date.now();
        const duration = app.sessionEndTime - app.sessionStartTime;

        // Calculate Type stats
        const totalCards = app.typeSessionCards.length;
        let firstTry = 0;
        let reviewed = 0;
        let totalAttempts = 0;
        let correctAttempts = 0;

        app.typeSessionCards.forEach(card => {
            totalAttempts += card.attempts;
            correctAttempts += card.correctAttempts;
            if (card.attempts === 1 && card.correctAttempts === 1) {
                firstTry++;
            } else {
                reviewed++;
            }
        });

        app.currentSessionStats = {
            mode: 'Type',
            duration: duration,
            totalCards: totalCards,
            firstTry: firstTry,
            reviewed: reviewed,
            totalAttempts: totalAttempts,
            accuracy: totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0, // Overall accuracy
            timeTaken: duration,
            deckHash: app.currentDeckHash
        };

        saveSessionResult(); // NEW: Save the result
        showSessionSummary();
    }

    /**
     * Finishes the Match session, calculates stats, and shows summary.
     * @param {number} time - The final time in milliseconds.
     */
    function finishMatchSession(time) {
        if (app.matchTimerInterval) {
            clearInterval(app.matchTimerInterval);
            app.matchTimerInterval = null;
        }

        const duration = time; 
        const totalCards = app.matchSessionCards.length;
        const isNewBest = duration < app.matchBestTime;
        
        if (isNewBest) {
            app.matchBestTime = duration;
            saveMatchBestTime();
        }

        app.currentSessionStats = {
            mode: 'Match',
            duration: duration,
            totalCards: totalCards,
            // For Match mode, we track if it was a new best time
            firstTry: isNewBest ? 1 : 0, 
            reviewed: isNewBest ? 0 : 1, // Represents 'didn't beat best'
            totalAttempts: 1, // One match game
            accuracy: 100, 
            timeTaken: duration,
            deckHash: app.currentDeckHash
        };

        saveSessionResult(); // NEW: Save the result
        showSessionSummary();
    }
    
    /**
     * Saves the result of the current session to the persistent history.
     */
    function saveSessionResult() {
        const stats = app.currentSessionStats;
        // Ensure only necessary data is saved to keep history clean
        const result = {
            mode: stats.mode,
            duration: stats.duration,
            totalCards: stats.totalCards,
            firstTry: stats.firstTry,
            reviewed: stats.reviewed,
            totalAttempts: stats.totalAttempts,
            accuracy: stats.accuracy,
            timeTaken: stats.timeTaken,
            deckHash: stats.deckHash,
            timestamp: Date.now()
        };
        app.sessionHistory.push(result);
        saveSessionHistory();
    }
    

    // --- SESSION SUMMARY VIEW LOGIC (NEW) ---

    let currentChart = null; // Variable to hold the Chart.js instance

    /**
     * Displays the session summary view with performance stats and chart.
     */
    function showSessionSummary() {
        showView('sessionSummary');
        const stats = app.currentSessionStats;
        const mode = stats.mode;
        const deckTitle = app.currentDeck.title || 'Untitled Deck';

        dom.summaryModeTitle.textContent = `${mode} Mode for "${deckTitle}"`;
        

        // 1. Populate Core Stats
        dom.summaryStatMode.textContent = mode;
        dom.summaryStatTime.textContent = mode === 'Match' ? formatDuration(stats.timeTaken) : formatDuration(stats.duration);
        dom.summaryStatFirstTry.textContent = stats.firstTry;
        dom.summaryStatReviewed.textContent = stats.reviewed;
        
        // Match Mode always shows number of cards as attempts/total cards
        const attemptsDisplay = mode === 'Match' ? stats.totalCards : stats.totalAttempts.toFixed(0);
        dom.summaryStatAttempts.textContent = attemptsDisplay;
        
        // Accuracy
        let accuracyDisplay = '';
        if (mode === 'Match') {
            accuracyDisplay = '100% (Completion)'; 
        } else if (stats.totalCards > 0) {
            accuracyDisplay = `${stats.accuracy.toFixed(1)}%`;
        } else {
            accuracyDisplay = 'N/A';
        }
        dom.summaryStatAccuracy.textContent = accuracyDisplay;

        // 2. Render Pie Chart
        const chartData = getChartData(stats);
        renderPieChart(chartData);

        // 3. Show Progress History
        updateHistoryComparison(stats);
    }

    /**
     * Gets the data structure for the pie chart based on the session mode.
     * @param {object} stats - The current session stats.
     * @returns {object} Data object for Chart.js.
     */
    function getChartData(stats) {
        let labels = [];
        let data = [];
        let colors = [];
        
        const rootStyles = getComputedStyle(document.documentElement);
        const colorSuccess = rootStyles.getPropertyValue('--color-chart-success').trim();
        const colorReview = rootStyles.getPropertyValue('--color-chart-review').trim();

        if (stats.mode === 'Learn' || stats.mode === 'Type') {
            labels = ['Got First Try', 'Needed Review'];
            data = [stats.firstTry, stats.reviewed];
            colors = [colorSuccess, colorReview];
            dom.chartTotalCards.textContent = stats.totalCards;
            document.getElementById('chart-center-text').querySelector('span:last-child').textContent = 'Total Cards';
        } else if (stats.mode === 'Match') {
            // For Match, the success is completing the entire set.
            labels = stats.firstTry > 0 ? ['New Best Time!'] : ['Completed'];
            data = [1];
            // Color based on if they beat their PB
            colors = [stats.firstTry > 0 ? colorSuccess : colorReview]; 
            dom.chartTotalCards.textContent = formatDuration(stats.timeTaken); // Use time as the center metric
            document.getElementById('chart-center-text').querySelector('span:last-child').textContent = 'Final Time';
        }
        
        return { labels, data, colors };
    }

    /**
     * Renders the Chart.js pie chart.
     * @param {object} chartData - The data object for the chart.
     */
    function renderPieChart(chartData) {
        if (currentChart) {
            currentChart.destroy();
        }

        const ctx = dom.sessionPieChart.getContext('2d');
        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary').trim();
        
        // Chart.js Configuration
        currentChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartData.labels,
                datasets: [{
                    data: chartData.data,
                    backgroundColor: chartData.colors,
                    borderColor: 'transparent',
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%', 
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            font: { size: 14 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                
                                if (app.currentSessionStats.mode === 'Match') {
                                    return ` ${label}`;
                                }
                                return ` ${label}: ${value} cards (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Updates the history comparison section.
     * @param {object} currentStats - The current session stats.
     */
    function updateHistoryComparison(currentStats) {
        const mode = currentStats.mode;
        const deckHash = currentStats.deckHash;
        
        // Find previous sessions for the same deck and mode, excluding the current one
        const previousSessions = app.sessionHistory
            .filter(s => s.deckHash === deckHash && s.mode === mode)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(1); // Exclude the just-saved current session

        const lastSession = previousSessions.length > 0 ? previousSessions[0] : null;

        dom.summaryHistoryModeName.textContent = mode;

        if (lastSession) {
            dom.summaryHistoryMessage.classList.add('hidden');
            dom.summaryHistoryStats.classList.remove('hidden');

            // Set last session stats
            dom.summaryLastTime.textContent = mode === 'Match' 
                ? formatDuration(lastSession.timeTaken) 
                : formatDuration(lastSession.duration);
                
            dom.summaryLastFirstTry.textContent = `${lastSession.firstTry} cards (${((lastSession.firstTry / lastSession.totalCards) * 100).toFixed(0)}%)`;

            // Calculate Improvement 
            let improvementText = '';
            let improvementColor = 'text-color-text-primary';

            if (mode === 'Match') {
                const diff = lastSession.timeTaken - currentStats.timeTaken;
                if (diff > 0) {
                    improvementText = `Faster by ${formatDuration(diff)} 🎉`;
                    improvementColor = 'text-color-correct';
                } else if (diff < 0) {
                    improvementText = `Slower by ${formatDuration(Math.abs(diff))}`;
                    improvementColor = 'text-color-incorrect';
                } else {
                    improvementText = 'No Change';
                }
            } else { // Learn/Type Mode (Focus on First Try % and Speed)
                const lastFirstTryRate = (lastSession.firstTry / lastSession.totalCards);
                const currentFirstTryRate = (currentStats.firstTry / currentStats.totalCards);
                const rateChange = (currentFirstTryRate - lastFirstTryRate) * 100;
                
                const lastTimePerCard = lastSession.duration / lastSession.totalCards;
                const currentTimePerCard = currentStats.duration / currentStats.totalCards;
                const timeChange = lastTimePerCard - currentTimePerCard; // Positive is faster
                
                const rateChangeAbs = Math.abs(rateChange);
                const timeChangeAbs = Math.abs(timeChange);

                if (rateChange > 1) {
                    improvementText = `+${rateChange.toFixed(0)}% Success Rate!`;
                    improvementColor = 'text-color-correct';
                    if (timeChange > 500) improvementText += ` (And faster by ${formatDuration(timeChange)})`;
                } else if (rateChange < -1) {
                    improvementText = `${rateChange.toFixed(0)}% Success Rate, review needed.`;
                    improvementColor = 'text-color-incorrect';
                } else if (timeChange > 500) { // Significant speed improvement (0.5s per card)
                    improvementText = `You sped up by ${formatDuration(timeChange)} per card!`;
                    improvementColor = 'text-color-correct';
                } else {
                    improvementText = 'Consistent performance.';
                    improvementColor = 'text-color-text-secondary';
                }
            }
            
            dom.summaryImprovementScore.textContent = improvementText;
            dom.summaryImprovementScore.className = `float-right font-bold ${improvementColor}`;

        } else {
            // First session for this mode/deck
            dom.summaryHistoryMessage.classList.remove('hidden');
            dom.summaryHistoryStats.classList.add('hidden');
        }
    }


    // --- EVENT LISTENERS (MODIFIED/NEW) ---

    // ... (All existing listeners remain the same) ...

    dom.summaryBackButton.addEventListener('click', () => {
        // Go back to the deck options view
        showView('options'); 
    });


    // --- INITIALIZATION ---
    initialize();
});
