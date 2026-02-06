// Smart Tutor Chatbot - Complete JavaScript Implementation
// =========================================================

// Configuration
let GEMINI_API_KEY = ''; // Will be loaded from localStorage or prompted
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// State Management
const state = {
    currentBot: null, // 'english' or 'gk'
    currentMode: null,
    currentQuiz: null, // Stores current quiz question and correct answer
    conversationHistory: [],
    userProgress: {
        streak: 0,
        lastVisit: null,
        totalPoints: 0,
        badges: [],
        stats: {
            wordsLearned: 0,
            questionsAsked: 0,
            quizzesCompleted: 0,
            storiesStarted: 0,
            sentencesFixed: 0
        },
        savedContent: {
            words: [],
            facts: [],
            stories: [],
            quizzes: []
        }
    },
    settings: {
        theme: 'blue',
        bubbleStyle: 'rounded',
        fontSize: 16,
        soundEnabled: true,
        ttsEnabled: false
    }
};

// Bot Modes Configuration
const botModes = {
    english: [
        {
            id: 'grammar',
            name: 'Grammar Help',
            icon: '📝',
            description: 'Fix sentences and learn grammar rules',
            systemPrompt: "You are English Buddy, a magical grammar wizard for kids! 🧙‍♂️ Check sentences for errors and explain corrections with sparkle. Use simple examples and always give a 'Wizard Word of Wisdom'. AWARD: If they did great, say '🌟 MARVELOUS! +10 Magic Points!'. Keep it fun and under 100 words."
        },
        {
            id: 'vocabulary',
            name: 'Vocabulary Builder',
            icon: '📚',
            description: 'Learn new words with examples',
            systemPrompt: "You are English Buddy, the Word Explorer! 🧭 Help kids find giant new words. For every word: 1) Definition, 2) 'Hero Sentence', 3) 'Word Buddy' (Synonym), 4) 'Magic Trick' to remember it. Use lots of emojis! Keep it under 100 words."
        },
        {
            id: 'story',
            name: 'Story Writer',
            icon: '✍️',
            description: 'Creative writing assistance',
            systemPrompt: "You are English Buddy, a Master Storyteller! 🐉 Help kids build epic adventures. Suggest character names like 'Captain Sparkletoe' or 'Professor Paw'. Give 3 'Story Starters' to choose from. Be super encouraging! Keep it under 120 words."
        },
        {
            id: 'conversation',
            name: 'Conversation Practice',
            icon: '💬',
            description: 'Practice English dialogue',
            systemPrompt: "You are English Buddy, the best friend ever! 🎈 Chat about school, pets, and superheroes. Ask 'What if?' questions to spark imagination. Gently fix mistakes but keep the fun going! High-five with emojis! Keep it under 80 words."
        },
        {
            id: 'quiz',
            name: 'Quiz Mode',
            icon: '🎯',
            description: 'Grammar and vocabulary quizzes',
            systemPrompt: "You are English Buddy Quiz Master! 🎤 Ask ONE fun multiple-choice question at a time. If they get it right, do a 'victory dance' with text emojis. Explain WHY it's right using a 'Hero Hint'. Keep it under 100 words."
        }
    ],
    gk: [
        {
            id: 'freeask',
            name: 'Free Ask',
            icon: '❓',
            description: 'Any general knowledge question',
            systemPrompt: "You are GK Genius, the world's most curious robot! 🤖 Answer any question with 'Beep Boop! Knowledge incoming!'. Give the answer, a 'Mind-Blowing Fact', and a 'System Scan' summary. Use tech and space emojis! Keep it under 100 words."
        },
        {
            id: 'quiz',
            name: 'Quiz Challenge',
            icon: '🏆',
            description: 'Random GK questions',
            systemPrompt: "You are GK Genius Quiz Master! ⚡ Ask one MCQ from Space, Animals, or Science. If they win, say 'CHAMPION ALERT! 🏆'. Explain the answer with a 'Genius Secret'. Keep it under 100 words."
        },
        {
            id: 'explorer',
            name: 'Topic Explorer',
            icon: '🔍',
            description: 'Deep dive into topics',
            systemPrompt: "You are GK Genius, the Time-Traveling Explorer! 🚀 When given a topic, provide: 3 'Historical Treasures' (facts), 1 'Future Vision', and a mini-challenge. Make it an adventure! Keep it under 150 words."
        },
        {
            id: 'funfacts',
            name: 'Fun Facts',
            icon: '💡',
            description: 'Interesting facts with explanations',
            systemPrompt: "You are GK Genius, the Fun Fact Factory! 🏭 Spit out facts that sound fake but are TRUE! Use 'WOW!' and 'UNBELIEVABLE!'. Ask 'Want another brain-booster?' at the end. Keep it under 80 words."
        }
    ]
};

// Quick Actions for each mode
const quickActions = {
    english: {
        grammar: ['Check my sentence', 'Grammar tip', 'Common mistakes'],
        vocabulary: ['Give me a word', 'Word of the day', 'Synonyms game'],
        story: ['Start a story', 'Character ideas', 'Plot twist'],
        conversation: ['Let\'s chat', 'Tell me about...', 'Ask me something'],
        quiz: ['Quiz me!', 'Easy question', 'Hard question']
    },
    gk: {
        freeask: ['Ask me anything', 'Surprise me', 'Random fact'],
        quiz: ['Quiz me!', 'Easy', 'Medium', 'Hard'],
        explorer: ['History', 'Science', 'Geography', 'Animals', 'Space'],
        funfacts: ['Fun fact!', 'Amazing fact', 'Weird fact']
    }
};

// Badge Definitions
const badges = [
    { id: 'wordsmith', name: 'Wordsmith', icon: '📖', requirement: 50, type: 'wordsLearned', description: 'Learn 50 new words' },
    { id: 'grammarpro', name: 'Grammar Pro', icon: '✅', requirement: 20, type: 'sentencesFixed', description: 'Fix 20 sentences correctly' },
    { id: 'storystarter', name: 'Story Starter', icon: '📝', requirement: 5, type: 'storiesStarted', description: 'Begin 5 stories' },
    { id: 'quizchamp', name: 'Quiz Champion', icon: '🏆', requirement: 10, type: 'quizzesCompleted', description: '10 quizzes in a row correct' },
    { id: 'knowledgeseeker', name: 'Knowledge Seeker', icon: '🧠', requirement: 100, type: 'questionsAsked', description: 'Ask 100 questions' },
    { id: 'weekwarrior', name: 'Week Warrior', icon: '🔥', requirement: 7, type: 'streak', description: '7 day streak' }
];

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    initializeWelcomeScreen();
    setupEventListeners();
    updateDailyFeatures();
    checkStreak();
    updateApiKeyBarStatus();
});

// Load User Data from localStorage
function loadUserData() {
    const savedProgress = localStorage.getItem('smartTutorProgress');
    const savedSettings = localStorage.getItem('smartTutorSettings');
    const savedHistory = localStorage.getItem('smartTutorHistory');
    const savedApiKey = localStorage.getItem('geminiApiKey');

    if (savedProgress) {
        state.userProgress = JSON.parse(savedProgress);
    }
    if (savedSettings) {
        state.settings = JSON.parse(savedSettings);
        applySettings();
    }
    if (savedHistory) {
        state.conversationHistory = JSON.parse(savedHistory);
    }
    if (savedApiKey) {
        GEMINI_API_KEY = savedApiKey;
    }
}

// Save User Data to localStorage
function saveUserData() {
    localStorage.setItem('smartTutorProgress', JSON.stringify(state.userProgress));
    localStorage.setItem('smartTutorSettings', JSON.stringify(state.settings));
    localStorage.setItem('smartTutorHistory', JSON.stringify(state.conversationHistory));
}

// Initialize Welcome Screen
function initializeWelcomeScreen() {
    document.getElementById('streakCounter').textContent = state.userProgress.streak;
    document.getElementById('totalPoints').textContent = state.userProgress.totalPoints;
    displayRecentConversations();
}

// Update Daily Features
async function updateDailyFeatures() {
    const today = new Date().toDateString();
    const lastUpdate = localStorage.getItem('lastDailyUpdate');

    if (lastUpdate !== today) {
        // Generate new daily content
        await generateWordOfDay();
        await generateFactOfDay();
        localStorage.setItem('lastDailyUpdate', today);
    } else {
        // Load saved daily content
        const savedWord = localStorage.getItem('wordOfDay');
        const savedFact = localStorage.getItem('factOfDay');
        if (savedWord) {
            const wordData = JSON.parse(savedWord);
            document.getElementById('wordOfDay').textContent = wordData.word;
            document.getElementById('wordDefinition').textContent = wordData.definition;
        }
        if (savedFact) {
            document.getElementById('factOfDay').textContent = savedFact;
        }
    }
}

// Generate Word of the Day
async function generateWordOfDay() {
    const words = [
        { word: 'Serendipity', definition: 'Finding something good without looking for it' },
        { word: 'Ephemeral', definition: 'Lasting for a very short time' },
        { word: 'Resilient', definition: 'Able to recover quickly from difficulties' },
        { word: 'Eloquent', definition: 'Fluent and persuasive in speaking or writing' },
        { word: 'Benevolent', definition: 'Well-meaning and kindly' }
    ];

    const randomWord = words[Math.floor(Math.random() * words.length)];
    document.getElementById('wordOfDay').textContent = randomWord.word;
    document.getElementById('wordDefinition').textContent = randomWord.definition;
    localStorage.setItem('wordOfDay', JSON.stringify(randomWord));
}

// Generate Fact of the Day
async function generateFactOfDay() {
    const facts = [
        'Honey never spoils! Archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible.',
        'A group of flamingos is called a "flamboyance"!',
        'The human brain uses 20% of the body\'s energy but only makes up 2% of its weight.',
        'Octopuses have three hearts and blue blood!',
        'The shortest war in history lasted only 38 minutes between Britain and Zanzibar in 1896.'
    ];

    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    document.getElementById('factOfDay').textContent = randomFact;
    localStorage.setItem('factOfDay', randomFact);
}

// Check and Update Streak
function checkStreak() {
    const today = new Date().toDateString();
    const lastVisit = state.userProgress.lastVisit;

    if (lastVisit) {
        const lastDate = new Date(lastVisit);
        const todayDate = new Date(today);
        const diffTime = Math.abs(todayDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            state.userProgress.streak++;
            showAchievementToast('Streak Continued!', `${state.userProgress.streak} days in a row! 🔥`);
        } else if (diffDays > 1) {
            state.userProgress.streak = 1;
        }
    } else {
        state.userProgress.streak = 1;
    }

    state.userProgress.lastVisit = today;
    saveUserData();
    document.getElementById('streakCounter').textContent = state.userProgress.streak;
    checkBadges();
}

// Display Recent Conversations
function displayRecentConversations() {
    const conversationList = document.getElementById('conversationList');
    const recentConvos = state.conversationHistory.slice(-5).reverse();

    if (recentConvos.length === 0) {
        conversationList.innerHTML = '<p class="no-conversations">No recent conversations yet. Start chatting!</p>';
        return;
    }

    conversationList.innerHTML = recentConvos.map(convo => `
        <div class="conversation-item" data-id="${convo.id}">
            <div class="conversation-avatar">${convo.bot === 'english' ? '📖' : '🌍'}</div>
            <div class="conversation-details">
                <div class="conversation-bot">${convo.bot === 'english' ? 'English Buddy' : 'GK Genius'}</div>
                <div class="conversation-preview">${convo.preview}</div>
            </div>
            <div class="conversation-time">${formatTime(convo.timestamp)}</div>
        </div>
    `).join('');
}

// Format Time
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// Setup Event Listeners
function setupEventListeners() {
    // Bot Selection
    document.querySelectorAll('.bot-card').forEach(card => {
        card.addEventListener('click', () => {
            const bot = card.dataset.bot;
            selectBot(bot);
        });
    });

    // Back Buttons
    document.getElementById('backToWelcome').addEventListener('click', () => {
        showScreen('welcomeScreen');
    });

    document.getElementById('backToModes').addEventListener('click', () => {
        showScreen('modeSelectionScreen');
    });

    // Chat Input
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    document.getElementById('sendBtn').addEventListener('click', sendMessage);

    // Voice Input
    document.getElementById('voiceInputBtn').addEventListener('click', toggleVoiceInput);

    // Settings
    document.getElementById('settingsBtn').addEventListener('click', () => {
        openModal('settingsModal');
    });

    document.getElementById('closeSettings').addEventListener('click', () => {
        closeModal('settingsModal');
    });

    // Progress
    document.getElementById('progressBtn').addEventListener('click', () => {
        openProgressModal();
    });

    document.getElementById('closeProgress').addEventListener('click', () => {
        closeModal('progressModal');
    });

    // Switch Mode
    document.getElementById('switchModeBtn').addEventListener('click', () => {
        showScreen('modeSelectionScreen');
    });

    // Theme Selection
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            setTheme(theme);
        });
    });

    // Bubble Style Selection
    document.querySelectorAll('.bubble-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const style = btn.dataset.style;
            setBubbleStyle(style);
        });
    });

    // Font Size
    document.getElementById('fontSizeSlider').addEventListener('input', (e) => {
        const size = e.target.value;
        setFontSize(size);
    });

    // Sound Toggle
    document.getElementById('soundToggle').addEventListener('change', (e) => {
        state.settings.soundEnabled = e.target.checked;
        saveUserData();
    });

    // TTS Toggle
    document.getElementById('ttsToggle').addEventListener('change', (e) => {
        state.settings.ttsEnabled = e.target.checked;
        saveUserData();
    });

    // Saved Content Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchSavedTab(tab);
        });
    });

    // API Key Bar Logic
    const apiKeyBar = document.getElementById('apiKeyBar');
    const toggleBtn = document.getElementById('toggleApiKeyBar');
    const saveBarBtn = document.getElementById('saveBarApiKeyBtn');
    const barInput = document.getElementById('barApiKeyInput');

    toggleBtn.addEventListener('click', () => {
        apiKeyBar.classList.toggle('expanded');
        if (apiKeyBar.classList.contains('expanded')) {
            barInput.focus();
            if (GEMINI_API_KEY) barInput.value = GEMINI_API_KEY;
        }
    });

    saveBarBtn.addEventListener('click', () => {
        const key = barInput.value.trim();
        if (key) {
            GEMINI_API_KEY = key;
            localStorage.setItem('geminiApiKey', key);
            updateApiKeyBarStatus();
            apiKeyBar.classList.remove('expanded');
            showAchievementToast('API Key Updated!', 'Smart Tutor is now smarter! 🚀');
        } else {
            alert('Please enter a key');
        }
    });

    // API Key Modal
    document.getElementById('saveApiKey').addEventListener('click', () => {
        const apiKey = document.getElementById('apiKeyInput').value.trim();
        if (apiKey) {
            GEMINI_API_KEY = apiKey;
            localStorage.setItem('geminiApiKey', apiKey);
            updateApiKeyBarStatus();
            closeModal('apiKeyModal');
            showAchievementToast('API Key Saved!', 'You can now use advanced AI responses! 🎉');
        } else {
            alert('Please enter a valid API key');
        }
    });

    document.getElementById('skipApiKey').addEventListener('click', () => {
        closeModal('apiKeyModal');
    });

    document.getElementById('closeApiKey').addEventListener('click', () => {
        closeModal('apiKeyModal');
    });
}

// Select Bot
function selectBot(bot) {
    state.currentBot = bot;
    showModeSelection(bot);
}

// Show Mode Selection
function showModeSelection(bot) {
    const modeGrid = document.getElementById('modeGrid');
    const modeTitle = document.getElementById('modeScreenTitle');

    const botName = bot === 'english' ? 'English Buddy' : 'GK Genius';
    modeTitle.textContent = `${botName} - Select Mode`;

    const modes = botModes[bot];
    modeGrid.innerHTML = modes.map(mode => `
        <div class="mode-card" data-mode="${mode.id}">
            <div class="mode-icon">${mode.icon}</div>
            <h3 class="mode-name">${mode.name}</h3>
            <p class="mode-description">${mode.description}</p>
        </div>
    `).join('');

    // Add click listeners to mode cards
    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => {
            const modeId = card.dataset.mode;
            selectMode(modeId);
        });
    });

    showScreen('modeSelectionScreen');
}

// Select Mode
function selectMode(modeId) {
    state.currentMode = modeId;
    startChat();
}

// Start Chat
function startChat() {
    // Check if API key is configured, if not show modal
    if (!GEMINI_API_KEY) {
        openModal('apiKeyModal');
    }

    const mode = botModes[state.currentBot].find(m => m.id === state.currentMode);

    // Update chat header
    const chatAvatar = document.getElementById('chatAvatar');
    const chatBotName = document.getElementById('chatBotName');
    const chatModeIndicator = document.getElementById('chatModeIndicator');

    chatAvatar.textContent = state.currentBot === 'english' ? '📖' : '🌍';
    chatBotName.textContent = state.currentBot === 'english' ? 'English Buddy' : 'GK Genius';
    chatModeIndicator.textContent = mode.name;

    // Clear messages and quiz state
    document.getElementById('chatMessages').innerHTML = '';
    state.currentQuiz = null;

    // Add welcome message
    const welcomeMessage = getWelcomeMessage(mode);
    addMessage('bot', welcomeMessage);

    // Update quick actions
    updateQuickActions();

    showScreen('chatScreen');
}

// Get Welcome Message
function getWelcomeMessage(mode) {
    const welcomeMessages = {
        english: {
            grammar: "Hi! I'm here to help you with grammar. Send me a sentence and I'll check it for you! 📝",
            vocabulary: "Hello! Ready to learn some awesome new words? Ask me about any word or say 'Give me a word'! 📚",
            story: "Hey there, storyteller! Let's create an amazing story together. What kind of story do you want to write? ✍️",
            conversation: "Hi friend! Let's practice English together. Tell me about your day or ask me anything! 💬",
            quiz: "Welcome to Quiz Mode! Ready to test your English skills? Say 'Quiz me!' when you're ready! 🎯"
        },
        gk: {
            freeask: "Hello, curious mind! Ask me anything you want to know about the world! ❓",
            quiz: "Welcome to GK Quiz Challenge! Ready to test your knowledge? Say 'Quiz me!' to start! 🏆",
            explorer: "Hi explorer! Which topic interests you? History, Science, Geography, Animals, or Space? 🔍",
            funfacts: "Hey there! Ready for some amazing facts? Say 'Fun fact!' and I'll blow your mind! 💡"
        }
    };

    return welcomeMessages[state.currentBot][state.currentMode];
}

// Update Quick Actions
function updateQuickActions() {
    const quickActionsContainer = document.getElementById('quickActions');
    const actions = quickActions[state.currentBot][state.currentMode];

    quickActionsContainer.innerHTML = actions.map(action => `
        <button class="quick-action-btn">${action}</button>
    `).join('');

    // Add click listeners
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.textContent;
            document.getElementById('chatInput').value = action;
            sendMessage();
        });
    });
}

// Send Message
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    // Add user message
    addMessage('user', message);
    input.value = '';

    // Show typing indicator
    showTypingIndicator();

    // Get bot response
    try {
        const result = await getBotResponse(message);
        hideTypingIndicator();
        addMessage('bot', result.text, result.source);

        // Update stats and save
        updateStats(message, result.text);
        saveConversation(message, result.text);

        // Text-to-speech if enabled
        if (state.settings.ttsEnabled) {
            speakText(result.text);
        }
    } catch (error) {
        hideTypingIndicator();
        addMessage('bot', "Oops! I'm having trouble connecting. Please try again! 😊");
        console.error('Error getting bot response:', error);
    }
}

// Check Quiz Answer
function checkQuizAnswer(userAnswer) {
    if (!state.currentQuiz) return null;

    const answer = userAnswer.toLowerCase().trim();
    const correctLetter = state.currentQuiz.correctLetter.toLowerCase();
    const correctAnswer = state.currentQuiz.correctAnswer.toLowerCase();

    // Check if answer matches (A, B, C or the full answer text)
    const isCorrect = answer === correctLetter ||
        answer.includes(correctAnswer) ||
        (answer.length === 1 && answer === correctLetter);

    return {
        isCorrect,
        correctLetter: state.currentQuiz.correctLetter,
        correctAnswer: state.currentQuiz.correctAnswer,
        explanation: state.currentQuiz.explanation
    };
}

// Get Bot Response from Gemini API

async function getBotResponse(userMessage) {
    const mode = botModes[state.currentBot].find(m => m.id === state.currentMode);
    const systemPrompt = mode.systemPrompt;

    // Check if API key is configured
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        return { text: getIntelligentFallback(userMessage), source: 'fallback' };
    }

    // Prepare conversation history for Gemini (last 6 turns)
    const history = state.conversationHistory.flatMap(conv => [
        { role: 'user', parts: [{ text: conv.messages[0].text }] },
        { role: 'model', parts: [{ text: conv.messages[1].text }] }
    ]).slice(-12); // Last 12 messages

    const requestBody = {
        contents: [
            ...history,
            {
                role: 'user',
                parts: [{ text: `SYSTEM INSTRUCTION: ${systemPrompt}\n\nUser: ${userMessage}` }]
            }
        ]
    };

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        updateApiKeyBarStatus('active');
        return { text: text, source: 'gemini' };
    } catch (error) {
        console.error('Gemini API Error:', error);
        updateApiKeyBarStatus('error');
        return { text: getIntelligentFallback(userMessage), source: 'fallback' };
    }
}

// Intelligent Fallback Response (when API is not available)
function getIntelligentFallback(message) {
    const msg = message.toLowerCase();

    // English Buddy responses
    if (state.currentBot === 'english') {
        if (state.currentMode === 'grammar') {
            // Sentence checking
            if (msg.includes('check') || msg.includes('correct') || msg.includes('is this right')) {
                return "I'd love to help check that! Here's a grammar tip: Always check that your subject and verb agree. For example, 'He runs' (not 'He run'). Also, don't forget punctuation at the end! Share a sentence and I'll help you improve it! 📝";
            }

            // Grammar tips
            if (msg.includes('tip') || msg.includes('advice') || msg.includes('help')) {
                const tips = [
                    "Here's a helpful tip: When writing, read your sentence out loud. If it sounds wrong, it probably is! Common mistakes to watch: their/there/they're, your/you're, and its/it's. 📝",
                    "Grammar tip: Every sentence needs a subject (who/what) and a verb (action). Example: 'The cat (subject) sleeps (verb).' Try making your own! 📝",
                    "Remember: Use 'a' before consonant sounds (a cat) and 'an' before vowel sounds (an apple). This makes your English sound natural! 📝"
                ];
                return tips[Math.floor(Math.random() * tips.length)];
            }

            // Punctuation
            if (msg.includes('punctuation') || msg.includes('comma') || msg.includes('period')) {
                return "Punctuation is like road signs for reading! Periods (.) end sentences. Commas (,) show pauses. Question marks (?) show questions. Exclamation marks (!) show excitement! Which one do you need help with? 📝";
            }

            // Tenses
            if (msg.includes('tense') || msg.includes('past') || msg.includes('present') || msg.includes('future')) {
                return "Tenses tell us WHEN something happens! Present: 'I eat' (now), Past: 'I ate' (before), Future: 'I will eat' (later). Which tense would you like to practice? 📝";
            }

            // Verbs
            if (msg.includes('verb') || msg.includes('action')) {
                return "Verbs are action words! They tell us what someone or something DOES. Examples: run, jump, think, sleep, eat. Can you think of a verb? Try using it in a sentence! 📝";
            }

            // Nouns
            if (msg.includes('noun') || msg.includes('person') || msg.includes('place') || msg.includes('thing')) {
                return "Nouns are naming words! They can be: People (teacher, friend), Places (school, park), Things (book, car), or Ideas (love, freedom). What noun would you like to use in a sentence? 📝";
            }

            // Adjectives
            if (msg.includes('adjective') || msg.includes('describe')) {
                return "Adjectives describe nouns! They make writing more interesting. Instead of 'dog', say 'big brown dog'. Instead of 'house', say 'beautiful old house'. Try adding adjectives to make your sentences colorful! 📝";
            }

            // Interjections
            if (msg.includes('interjection') || msg.includes('exclamation')) {
                return "Interjections are words that express strong feelings or sudden emotions! They're usually followed by an exclamation mark. Examples: Wow! Ouch! Yay! Oops! Hey! Hurray! They add emotion to your writing! 📝";
            }

            // Pronouns
            if (msg.includes('pronoun') || msg.includes('he') || msg.includes('she') || msg.includes('they')) {
                return "Pronouns replace nouns so we don't repeat them! Examples: I, you, he, she, it, we, they. Instead of 'John went to John's house', we say 'John went to his house'. Much better! 📝";
            }

            // Adverbs
            if (msg.includes('adverb') || msg.includes('how') || msg.includes('when') || msg.includes('where')) {
                return "Adverbs describe verbs! They tell us HOW, WHEN, or WHERE something happens. Examples: quickly, slowly, yesterday, here, carefully. 'She ran quickly' - 'quickly' describes how she ran! 📝";
            }

            // Prepositions
            if (msg.includes('preposition') || msg.includes('in') || msg.includes('on') || msg.includes('at')) {
                return "Prepositions show relationships between words! They tell us WHERE or WHEN. Examples: in, on, at, under, over, beside, before, after. 'The cat is ON the table' - 'on' shows where! 📝";
            }

            // Default varied responses
            const defaultGrammar = [
                "That looks good! Remember: Start sentences with capital letters, use commas for pauses, and end with proper punctuation (. ! ?). Keep up the great work! 📝",
                "Nice work! Grammar tip: Make sure every sentence has a subject and a verb. Read it aloud to check if it sounds right! 📝",
                "Great effort! Remember to check: Capital letter at start? Subject-verb agreement? Punctuation at end? You're doing well! 📝",
                "Good job! Here's a quick check: Does your sentence make sense? Is it complete? Does it have proper punctuation? Keep practicing! 📝"
            ];
            return defaultGrammar[Math.floor(Math.random() * defaultGrammar.length)];
        }

        if (state.currentMode === 'vocabulary') {
            if (msg.includes('give me a word') || msg.includes('word of the day')) {
                const words = [
                    { word: 'Magnificent', def: 'extremely beautiful or impressive', ex: 'The sunset was magnificent!', tip: 'Think: MAGnificent = MAGical!' },
                    { word: 'Curious', def: 'eager to learn or know something', ex: 'She was curious about how planes fly.', tip: 'Curious cats want to know everything!' },
                    { word: 'Brave', def: 'showing courage', ex: 'The brave firefighter saved the cat.', tip: 'Brave people face their fears!' },
                    { word: 'Generous', def: 'willing to give and share', ex: 'He was generous with his toys.', tip: 'Generous = GENerous with GENerosity!' }
                ];
                const randomWord = words[Math.floor(Math.random() * words.length)];
                return `📚 New Word: **${randomWord.word}**\n\nDefinition: ${randomWord.def}\n\nExample: "${randomWord.ex}"\n\nMemory Trick: ${randomWord.tip}\n\nTry using this word today!`;
            }
            return "Words are amazing! The more words you know, the better you can express yourself. Try to learn one new word every day and use it in a sentence. What word would you like to learn about? 📚";
        }

        if (state.currentMode === 'story') {
            if (msg.includes('start') || msg.includes('begin')) {
                const starters = [
                    "Once upon a time, in a magical forest, there lived a curious fox who discovered a mysterious door...",
                    "In a world where robots and humans lived together, a young inventor created something amazing...",
                    "On a stormy night, Emma found a glowing book in her grandmother's attic that could...",
                    "Deep in the ocean, a brave little fish named Finn decided to explore the forbidden coral reef..."
                ];
                return starters[Math.floor(Math.random() * starters.length)] + "\n\nWhat happens next? Continue the story! ✍️";
            }
            if (msg.includes('character') || msg.includes('idea')) {
                return "Great stories need interesting characters! Think about: What do they look like? What do they want? What's their biggest fear? Try creating a hero who's brave but also has a funny weakness! ✍️";
            }
            return "Every great story has a beginning (introduce characters), middle (problem/adventure), and end (solution). Add details about what characters see, hear, and feel. Keep writing - you're doing great! ✍️";
        }


        if (state.currentMode === 'conversation') {
            // Greetings
            if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
                const greetings = [
                    "Hello! I'm so happy to chat with you! Tell me, what's your favorite thing to do after school? 💬",
                    "Hi there! How's your day going? I'd love to hear about it! 💬",
                    "Hey! Great to see you! What would you like to talk about today? 💬"
                ];
                return greetings[Math.floor(Math.random() * greetings.length)];
            }

            // School-related
            if (msg.includes('school') || msg.includes('class') || msg.includes('teacher') || msg.includes('homework')) {
                return "School is such an important part of life! What's your favorite subject? I think every subject teaches us something valuable. Math helps us solve problems, English helps us express ourselves, and science helps us understand the world! 📚";
            }

            // Hobbies and activities
            if (msg.includes('play') || msg.includes('game') || msg.includes('hobby') || msg.includes('fun')) {
                return "Playing and having hobbies is so important! It helps us relax and learn new skills. What games or activities do you enjoy? Whether it's sports, video games, drawing, or reading - they all help us grow in different ways! 🎮";
            }

            // Family
            if (msg.includes('family') || msg.includes('mom') || msg.includes('dad') || msg.includes('brother') || msg.includes('sister') || msg.includes('parent')) {
                return "Family is wonderful! They're the people who care about us the most. Do you have siblings? What do you like doing with your family? Family time is precious! 👨‍👩‍👧‍👦";
            }

            // Food
            if (msg.includes('food') || msg.includes('eat') || msg.includes('hungry') || msg.includes('lunch') || msg.includes('dinner') || msg.includes('breakfast')) {
                return "Food is not just fuel - it's also about culture and memories! What's your favorite food? I find it interesting how different cultures have different cuisines. Do you like trying new foods? 🍕";
            }

            // Animals/Pets
            if (msg.includes('pet') || msg.includes('dog') || msg.includes('cat') || msg.includes('animal')) {
                return "Animals are amazing! Do you have any pets? If you could have any pet in the world, what would it be? Pets teach us responsibility and give us companionship. Even learning about wild animals is fascinating! 🐕";
            }

            // Sports
            if (msg.includes('sport') || msg.includes('soccer') || msg.includes('basketball') || msg.includes('football') || msg.includes('cricket')) {
                return "Sports are great for staying healthy and learning teamwork! Do you play any sports? Even if you don't play, watching sports can be exciting. What's your favorite sport to play or watch? ⚽";
            }

            // Books/Reading
            if (msg.includes('book') || msg.includes('read') || msg.includes('story')) {
                return "Reading is like having adventures without leaving your room! What kind of books do you like? Fantasy, mystery, adventure? Books help us learn new words and imagine new worlds. Do you have a favorite book or author? 📖";
            }

            // Movies/TV
            if (msg.includes('movie') || msg.includes('film') || msg.includes('watch') || msg.includes('tv') || msg.includes('show')) {
                return "Movies and shows are great entertainment! What's your favorite movie or TV show? I think stories, whether in books or on screen, help us understand different perspectives and emotions. What genre do you like best? 🎬";
            }

            // Weather
            if (msg.includes('weather') || msg.includes('rain') || msg.includes('sunny') || msg.includes('cold') || msg.includes('hot')) {
                return "Weather affects our mood and activities! What's your favorite type of weather? I think rainy days are cozy for reading, while sunny days are perfect for outdoor fun. What do you like to do in different weather? ☀️";
            }

            // Feelings/Emotions
            if (msg.includes('happy') || msg.includes('sad') || msg.includes('angry') || msg.includes('excited') || msg.includes('feel')) {
                return "It's important to talk about our feelings! Everyone feels different emotions, and that's completely normal. What makes you feel happy? Remember, it's okay to feel sad sometimes too - talking about it helps! 😊";
            }

            // Friends
            if (msg.includes('friend') || msg.includes('buddy') || msg.includes('pal')) {
                return "Friends make life more fun! Good friends support each other and share good times together. What do you like doing with your friends? Friendship is about being kind, listening, and having fun together! 👫";
            }

            // Music
            if (msg.includes('music') || msg.includes('song') || msg.includes('sing')) {
                return "Music is universal! Every culture has music. What kind of music do you like? Do you play any instruments or enjoy singing? Music can make us happy, help us relax, or give us energy! 🎵";
            }

            // Technology/Games
            if (msg.includes('computer') || msg.includes('phone') || msg.includes('internet') || msg.includes('video')) {
                return "Technology is amazing! It helps us learn, communicate, and have fun. What's your favorite thing to do with technology? Remember to balance screen time with other activities too! 💻";
            }

            // Questions
            if (msg.includes('?') || msg.includes('what') || msg.includes('why') || msg.includes('how')) {
                return "That's a great question! Asking questions shows you're curious and want to learn. I love answering questions! Can you tell me more about what you're wondering? The more specific you are, the better I can help! ❓";
            }

            // Favorites
            if (msg.includes('favorite') || msg.includes('best') || msg.includes('love')) {
                return "It's fun to talk about our favorites! Our favorites tell a lot about who we are and what we enjoy. What else do you love? Whether it's a color, food, activity, or place - I'd love to hear about it! ⭐";
            }

            // Learning/Help
            if (msg.includes('learn') || msg.includes('help') || msg.includes('teach') || msg.includes('understand')) {
                return "I'm here to help you learn! What would you like to know more about? Learning is a journey, and asking for help is a sign of strength, not weakness. What can I help you with today? 📚";
            }

            // Time-related
            if (msg.includes('today') || msg.includes('yesterday') || msg.includes('tomorrow')) {
                return "Time is interesting! Each day is a new opportunity. What did you do today? Or what are you planning for tomorrow? Talking about our daily experiences helps us practice English naturally! 📅";
            }

            // Default varied responses
            const defaultResponses = [
                "That's interesting! Tell me more about that. I'm curious to hear your thoughts! 💬",
                "I see! Can you explain a bit more? The more we talk, the better your English gets! 💬",
                "Wow! That sounds cool! What else can you tell me about it? 💬",
                "Nice! I'd love to hear more details. What do you think about it? 💬",
                "Interesting point! How do you feel about that? Sharing our thoughts helps us practice! 💬",
                "That's a good topic! What's your opinion on it? I'm here to listen and chat! 💬",
                "Cool! Can you give me an example? Examples help make conversations more interesting! 💬",
                "I understand! What made you think of that? I love hearing your ideas! 💬"
            ];

            return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
        }


        if (state.currentMode === 'quiz') {
            // Check if user is answering a previous quiz question
            if (state.currentQuiz) {
                const result = checkQuizAnswer(msg);
                if (result.isCorrect) {
                    state.currentQuiz = null; // Clear quiz after correct answer
                    return `✅ **Correct!** Great job! 🎉\n\n${result.explanation}\n\nYou're doing amazing! Want another question? Say 'Quiz me!'`;
                } else {
                    state.currentQuiz = null; // Clear quiz
                    return `❌ **Not quite!** The correct answer is **${result.correctLetter}) ${result.correctAnswer}**\n\n${result.explanation}\n\nDon't worry, mistakes help us learn! Try another one? Say 'Quiz me!'`;
                }
            }

            // Generate new quiz question
            if (msg.includes('quiz') || msg.includes('question') || msg.includes('easy') || msg.includes('hard')) {
                const quizzes = [
                    {
                        question: "Which sentence is correct?",
                        options: {
                            A: "She don't like pizza",
                            B: "She doesn't like pizza",
                            C: "She doesn't likes pizza"
                        },
                        correct: "B",
                        correctAnswer: "She doesn't like pizza",
                        explanation: "We use 'doesn't' (does not) with 'she/he/it', and the main verb stays in base form (like, not likes)."
                    },
                    {
                        question: "What's the plural of 'child'?",
                        options: {
                            A: "Childs",
                            B: "Children",
                            C: "Childrens"
                        },
                        correct: "B",
                        correctAnswer: "Children",
                        explanation: "'Child' is an irregular noun. Its plural form is 'children', not 'childs'. Some words don't follow the regular -s/-es pattern!"
                    },
                    {
                        question: "Which word means 'very happy'?",
                        options: {
                            A: "Sad",
                            B: "Joyful",
                            C: "Angry"
                        },
                        correct: "B",
                        correctAnswer: "Joyful",
                        explanation: "'Joyful' means full of joy or very happy. It's a positive emotion word!"
                    },
                    {
                        question: "Choose the correct verb form:",
                        options: {
                            A: "I am going to school",
                            B: "I is going to school",
                            C: "I are going to school"
                        },
                        correct: "A",
                        correctAnswer: "I am going to school",
                        explanation: "We use 'am' with 'I', 'is' with 'he/she/it', and 'are' with 'you/we/they'."
                    }
                ];

                const quiz = quizzes[Math.floor(Math.random() * quizzes.length)];
                state.currentQuiz = {
                    correctLetter: quiz.correct,
                    correctAnswer: quiz.correctAnswer,
                    explanation: quiz.explanation
                };

                return `🎯 **${quiz.question}**\n\nA) ${quiz.options.A}\nB) ${quiz.options.B}\nC) ${quiz.options.C}\n\nType A, B, or C to answer!`;
            }

            return "Good thinking! Remember: Practice makes perfect. Every mistake is a chance to learn. Want another question? Just say 'Quiz me!' 🎯";
        }
    }

    // GK Genius responses
    if (state.currentBot === 'gk') {
        if (state.currentMode === 'freeask') {
            const facts = [
                "Great question! Here's something cool: The Earth is about 4.5 billion years old! That's older than you can imagine. Did you know that dinosaurs lived millions of years ago but humans have only been around for about 300,000 years? 🌍",
                "Interesting! Let me tell you: The human heart beats about 100,000 times per day! That's like a drum that never stops. Did you know your heart pumps enough blood to fill a swimming pool every year? 💓",
                "Wow! Here's a fact: Light travels so fast it could go around Earth 7.5 times in just ONE second! Did you know it takes 8 minutes for sunlight to reach Earth? ⚡",
                "Cool question! Did you know: There are more stars in the universe than grains of sand on all Earth's beaches! The universe is HUGE! Did you know our galaxy has over 100 billion stars? ✨"
            ];
            return facts[Math.floor(Math.random() * facts.length)];
        }


        if (state.currentMode === 'quiz') {
            // Check if user is answering a previous quiz question
            if (state.currentQuiz) {
                const result = checkQuizAnswer(msg);
                if (result.isCorrect) {
                    state.currentQuiz = null; // Clear quiz after correct answer
                    return `✅ **Correct!** Awesome! 🎉\n\n${result.explanation}\n\nYou're a knowledge champion! Ready for another? Say 'Quiz me!'`;
                } else {
                    state.currentQuiz = null; // Clear quiz
                    return `❌ **Not quite!** The correct answer is **${result.correctLetter}) ${result.correctAnswer}**\n\n${result.explanation}\n\nKeep learning! Try another question? Say 'Quiz me!'`;
                }
            }

            // Generate new quiz question
            if (msg.includes('quiz') || msg.includes('question') || msg.includes('easy') || msg.includes('medium') || msg.includes('hard')) {
                const quizzes = [
                    {
                        question: "What is the largest planet in our solar system?",
                        options: {
                            A: "Earth",
                            B: "Jupiter",
                            C: "Saturn"
                        },
                        correct: "B",
                        correctAnswer: "Jupiter",
                        explanation: "Jupiter is the largest planet! It's so big that more than 1,300 Earths could fit inside it. It's a gas giant with beautiful swirling storms!"
                    },
                    {
                        question: "How many continents are there?",
                        options: {
                            A: "5",
                            B: "6",
                            C: "7"
                        },
                        correct: "C",
                        correctAnswer: "7",
                        explanation: "There are 7 continents: Africa, Antarctica, Asia, Australia, Europe, North America, and South America. Each one is unique!"
                    },
                    {
                        question: "What do bees make?",
                        options: {
                            A: "Milk",
                            B: "Honey",
                            C: "Butter"
                        },
                        correct: "B",
                        correctAnswer: "Honey",
                        explanation: "Bees make honey! They collect nectar from flowers and turn it into sweet, golden honey. A single bee makes only about 1/12 of a teaspoon in its lifetime!"
                    },
                    {
                        question: "What is the fastest land animal?",
                        options: {
                            A: "Lion",
                            B: "Cheetah",
                            C: "Horse"
                        },
                        correct: "B",
                        correctAnswer: "Cheetah",
                        explanation: "The cheetah is the fastest land animal! It can run up to 70 mph (112 km/h) in short bursts. That's faster than a car on the highway!"
                    },
                    {
                        question: "What is the capital of France?",
                        options: {
                            A: "London",
                            B: "Paris",
                            C: "Rome"
                        },
                        correct: "B",
                        correctAnswer: "Paris",
                        explanation: "Paris is the capital of France! It's known as the 'City of Light' and is famous for the Eiffel Tower, which was built in 1889."
                    },
                    {
                        question: "How many legs does a spider have?",
                        options: {
                            A: "6",
                            B: "8",
                            C: "10"
                        },
                        correct: "B",
                        correctAnswer: "8",
                        explanation: "Spiders have 8 legs! This is what makes them arachnids, not insects. Insects have 6 legs. All spiders have 8 legs, no matter their size!"
                    }
                ];

                const quiz = quizzes[Math.floor(Math.random() * quizzes.length)];
                state.currentQuiz = {
                    correctLetter: quiz.correct,
                    correctAnswer: quiz.correctAnswer,
                    explanation: quiz.explanation
                };

                return `🏆 **Quiz Time!**\n\n${quiz.question}\n\nA) ${quiz.options.A}\nB) ${quiz.options.B}\nC) ${quiz.options.C}\n\nType A, B, or C to answer!`;
            }

            return "Nice try! Every question helps you learn. Remember: The more you know, the more you grow! Want another quiz? Say 'Quiz me!' 🏆";
        }

        if (state.currentMode === 'explorer') {
            if (msg.includes('science')) {
                return "🔬 Science is amazing!\n\n5 Cool Facts:\n1. Water can be solid, liquid, or gas\n2. Plants make their own food using sunlight\n3. Sound travels through air as waves\n4. Magnets attract iron and steel\n5. Your body has 206 bones\n\nWOW Fact: Lightning is 5 times hotter than the sun! ⚡";
            }
            if (msg.includes('history')) {
                return "📜 History is fascinating!\n\n5 Key Facts:\n1. Ancient Egyptians built pyramids 4,500 years ago\n2. Dinosaurs lived millions of years before humans\n3. The first airplane flew in 1903\n4. Humans landed on the moon in 1969\n5. The internet was invented in the 1960s\n\nWOW Fact: Cleopatra lived closer to the iPhone than to the pyramids! 🏛️";
            }
            if (msg.includes('space') || msg.includes('astronomy')) {
                return "🚀 Space is incredible!\n\n5 Amazing Facts:\n1. The sun is a star, not a planet\n2. There are 8 planets in our solar system\n3. A day on Venus is longer than its year\n4. Saturn's rings are made of ice and rock\n5. The moon controls Earth's tides\n\nWOW Fact: You could fit 1.3 million Earths inside the sun! ☀️";
            }
            return "Pick a topic to explore: History, Science, Geography, Animals, or Space! Each one is full of amazing discoveries! 🔍";
        }

        if (state.currentMode === 'funfacts') {
            const facts = [
                "💡 Fun Fact: Bananas are berries, but strawberries aren't! Weird, right? Berries have seeds inside, and bananas do! Did you know watermelons are berries too? 🍌",
                "💡 Fun Fact: A group of owls is called a 'parliament'! How fancy! Did you know owls can turn their heads 270 degrees? 🦉",
                "💡 Fun Fact: Sharks have been around longer than trees! They're over 400 million years old! Did you know some sharks glow in the dark? 🦈",
                "💡 Fun Fact: Your nose can remember 50,000 different smells! That's amazing! Did you know smell is the strongest sense tied to memory? 👃"
            ];
            return facts[Math.floor(Math.random() * facts.length)];
        }
    }

    return "That's interesting! Keep asking questions and exploring. Learning is an adventure! 🌟";
}

// Add Message to Chat
function addMessage(sender, text, aiSource) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? '👤' : (state.currentBot === 'english' ? '📖' : '🌍');

    const content = document.createElement('div');
    content.className = 'message-content';

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${state.settings.bubbleStyle}`;

    // Add AI Source Badge for bot messages
    if (sender === 'bot' && aiSource) {
        const badge = document.createElement('div');
        badge.className = `ai-badge ${aiSource}`;
        badge.textContent = aiSource === 'gemini' ? '✨ Gemini Pro AI' : '💡 Basic Mode';
        bubble.appendChild(badge);
    }

    const messageText = document.createElement('div');
    messageText.className = 'message-text';

    // Support rich markdown formatting
    const formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>')
        .replace(/^\-\s+(.*)$/gm, '<li>$1</li>');

    // Wrap lists if found
    let finalHtml = formattedText;
    if (finalHtml.includes('<li>')) {
        finalHtml = formattedText.replace(/(<li>.*<\/li>)+/g, '<ul>$&</ul>');
    }
    finalHtml = finalHtml.replace(/\n/g, '<br>');

    const timestamp = document.createElement('div');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bubble.appendChild(messageText);
    bubble.appendChild(timestamp);

    // Regenerate button for bot messages
    if (sender === 'bot' && aiSource === 'gemini') {
        const regenBtn = document.createElement('button');
        regenBtn.className = 'regenerate-btn';
        regenBtn.textContent = 'Try Again';
        regenBtn.onclick = () => {
            const lastUserMsg = state.conversationHistory[state.conversationHistory.length - 1]?.messages[0]?.text;
            if (lastUserMsg) {
                document.getElementById('chatInput').value = lastUserMsg;
                sendMessage();
            }
        };
        bubble.appendChild(regenBtn);
    }

    content.appendChild(bubble);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    messagesContainer.appendChild(messageDiv);

    // Typewriter effect for bot
    if (sender === 'bot') {
        typewriterEffect(messageText, finalHtml);
        if (text.toLowerCase().includes('marvelous') || text.toLowerCase().includes('champion')) {
            createSparkles(messageDiv);
        }
        // Play sound if enabled
        if (state.settings.soundEnabled) {
            playNotificationSound();
        }
    } else {
        messageText.innerHTML = finalHtml;
    }

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Typewriter Effect
function typewriterEffect(element, html) {
    element.innerHTML = '';
    element.classList.add('typewriter-cursor');

    // Create a temporary element to parse the HTML safely
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const content = temp.innerHTML;

    let i = 0;
    const speed = 15; // ms per character

    function type() {
        if (i < content.length) {
            // Support HTML tags by jumping through them
            if (content[i] === '<') {
                const tagEnd = content.indexOf('>', i);
                if (tagEnd !== -1) {
                    i = tagEnd + 1;
                }
            } else {
                i++;
            }
            element.innerHTML = content.substring(0, i);
            document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
            setTimeout(type, speed);
        } else {
            element.classList.remove('typewriter-cursor');
        }
    }
    type();
}

// Sparkle Effect
function createSparkles(parent) {
    for (let i = 0; i < 10; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.textContent = ['✨', '🌟', '⭐', '🌈'][Math.floor(Math.random() * 4)];
        sparkle.style.left = Math.random() * 100 + '%';
        sparkle.style.top = Math.random() * 100 + '%';
        sparkle.style.animationDelay = (Math.random() * 0.5) + 's';
        parent.appendChild(sparkle);
        setTimeout(() => sparkle.remove(), 1000);
    }
}


// Show/Hide Typing Indicator
function showTypingIndicator() {
    document.getElementById('typingIndicator').classList.add('active');
}

function hideTypingIndicator() {
    document.getElementById('typingIndicator').classList.remove('active');
}

// Voice Input
function toggleVoiceInput() {
    const btn = document.getElementById('voiceInputBtn');

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Speech recognition is not supported in your browser. Please try Chrome or Edge.');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
        btn.classList.add('recording');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('chatInput').value = transcript;
    };

    recognition.onend = () => {
        btn.classList.remove('recording');
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        btn.classList.remove('recording');
    };

    recognition.start();
}

// Text-to-Speech
function speakText(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Clean the text - remove markdown formatting and emojis
        let cleanText = text
            .replace(/\*\*/g, '') // Remove bold markdown
            .replace(/\*/g, '')   // Remove italic markdown
            .replace(/\n\n/g, '. ') // Replace double newlines with periods
            .replace(/\n/g, ', ')   // Replace single newlines with commas
            .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
            .replace(/📚|📖|📝|✍️|💬|🎯|❓|🏆|🔍|💡|🌍|⚡|✨|💓|🌟|🔥|⭐/g, '') // Remove specific emojis
            .trim();

        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Get available voices
        let voices = window.speechSynthesis.getVoices();

        // If voices aren't loaded yet, wait for them
        if (voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
                setVoiceAndSpeak(utterance, voices);
            };
        } else {
            setVoiceAndSpeak(utterance, voices);
        }
    }
}

// Helper function to set voice and speak
function setVoiceAndSpeak(utterance, voices) {
    // Prefer English voices, especially female or child voices for kid-friendly sound
    const preferredVoices = [
        'Google US English Female',
        'Microsoft Zira Desktop',
        'Google UK English Female',
        'Microsoft David Desktop',
        'Google US English',
        'en-US',
        'en-GB'
    ];

    let selectedVoice = null;

    // Try to find a preferred voice
    for (const preferred of preferredVoices) {
        selectedVoice = voices.find(voice =>
            voice.name.includes(preferred) ||
            voice.lang.includes('en-US') ||
            voice.lang.includes('en-GB')
        );
        if (selectedVoice) break;
    }

    // If no preferred voice found, use the first English voice
    if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
    }

    // If still no voice, use default
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    // Set natural speaking parameters for kids
    utterance.rate = 0.85;  // Slightly slower for clarity
    utterance.pitch = 1.1;  // Slightly higher pitch for friendliness
    utterance.volume = 1;   // Full volume

    // Speak the text
    window.speechSynthesis.speak(utterance);
}

// Update Stats
function updateStats(userMessage, botResponse) {
    state.userProgress.questionsAsked++;

    // Check for specific actions
    if (state.currentMode === 'vocabulary') {
        state.userProgress.stats.wordsLearned++;
    }
    if (state.currentMode === 'grammar') {
        state.userProgress.stats.sentencesFixed++;
    }
    if (state.currentMode === 'story') {
        if (userMessage.toLowerCase().includes('start')) {
            state.userProgress.stats.storiesStarted++;
        }
    }
    if (state.currentMode === 'quiz') {
        state.userProgress.stats.quizzesCompleted++;
    }

    // Award points
    state.userProgress.totalPoints += 10;
    document.getElementById('totalPoints').textContent = state.userProgress.totalPoints;

    checkBadges();
    saveUserData();
}

// Save Conversation
function saveConversation(userMessage, botResponse) {
    const conversation = {
        id: Date.now(),
        bot: state.currentBot,
        mode: state.currentMode,
        preview: userMessage.substring(0, 50) + '...',
        timestamp: new Date().toISOString(),
        messages: [
            { sender: 'user', text: userMessage },
            { sender: 'bot', text: botResponse }
        ]
    };

    state.conversationHistory.push(conversation);

    // Keep only last 50 conversations
    if (state.conversationHistory.length > 50) {
        state.conversationHistory = state.conversationHistory.slice(-50);
    }

    saveUserData();
}

// Check Badges
function checkBadges() {
    badges.forEach(badge => {
        if (!state.userProgress.badges.includes(badge.id)) {
            let value = 0;
            if (badge.type === 'streak') {
                value = state.userProgress.streak;
            } else {
                value = state.userProgress.stats[badge.type] || 0;
            }

            if (value >= badge.requirement) {
                unlockBadge(badge);
            }
        }
    });
}

// Unlock Badge
function unlockBadge(badge) {
    state.userProgress.badges.push(badge.id);
    state.userProgress.totalPoints += 100;
    showAchievementToast(`${badge.name} Unlocked!`, badge.description);
    saveUserData();
}

// Show Achievement Toast
function showAchievementToast(title, description) {
    const toast = document.getElementById('achievementToast');
    document.getElementById('achievementTitle').textContent = title;
    document.getElementById('achievementDescription').textContent = description;

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// Open Progress Modal
function openProgressModal() {
    displayBadges();
    displayStats();
    displaySavedContent('words');
    openModal('progressModal');
}

// Display Badges
function displayBadges() {
    const badgesGrid = document.getElementById('badgesGrid');

    badgesGrid.innerHTML = badges.map(badge => {
        const unlocked = state.userProgress.badges.includes(badge.id);
        return `
            <div class="badge-item ${unlocked ? 'unlocked' : 'locked'}">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
            </div>
        `;
    }).join('');
}

// Display Stats
function displayStats() {
    const statsGrid = document.getElementById('statsGrid');

    const stats = [
        { label: 'Words Learned', value: state.userProgress.stats.wordsLearned },
        { label: 'Questions Asked', value: state.userProgress.stats.questionsAsked },
        { label: 'Quizzes Completed', value: state.userProgress.stats.quizzesCompleted },
        { label: 'Stories Started', value: state.userProgress.stats.storiesStarted },
        { label: 'Sentences Fixed', value: state.userProgress.stats.sentencesFixed },
        { label: 'Total Points', value: state.userProgress.totalPoints }
    ];

    statsGrid.innerHTML = stats.map(stat => `
        <div class="stat-item">
            <div class="stat-item-value">${stat.value}</div>
            <div class="stat-item-label">${stat.label}</div>
        </div>
    `).join('');
}

// Display Saved Content
function displaySavedContent(tab) {
    const savedContent = document.getElementById('savedContent');
    const content = state.userProgress.savedContent[tab] || [];

    if (content.length === 0) {
        savedContent.innerHTML = '<p class="no-conversations">No saved content yet.</p>';
        return;
    }

    savedContent.innerHTML = content.map(item => `
        <div class="saved-item">
            <div class="saved-item-title">${item.title}</div>
            <div class="saved-item-content">${item.content}</div>
        </div>
    `).join('');
}

// Switch Saved Tab
function switchSavedTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });

    displaySavedContent(tab);
}

// Settings Functions
function setTheme(theme) {
    state.settings.theme = theme;
    document.body.dataset.theme = theme;

    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === theme) {
            btn.classList.add('active');
        }
    });

    saveUserData();
}

function setBubbleStyle(style) {
    state.settings.bubbleStyle = style;

    document.querySelectorAll('.bubble-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.style === style) {
            btn.classList.add('active');
        }
    });

    // Update existing messages
    document.querySelectorAll('.message-bubble').forEach(bubble => {
        bubble.className = `message-bubble ${style}`;
    });

    saveUserData();
}

function setFontSize(size) {
    state.settings.fontSize = parseInt(size);
    document.documentElement.style.setProperty('--font-size', `${size}px`);
    document.getElementById('fontSizeValue').textContent = `${size}px`;
    saveUserData();
}

function applySettings() {
    setTheme(state.settings.theme);
    setBubbleStyle(state.settings.bubbleStyle);
    setFontSize(state.settings.fontSize);
    document.getElementById('soundToggle').checked = state.settings.soundEnabled;
    document.getElementById('ttsToggle').checked = state.settings.ttsEnabled;
    document.getElementById('fontSizeSlider').value = state.settings.fontSize;
}

// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Screen Management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Play Notification Sound
function playNotificationSound() {
    // Create a simple beep sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// Update API Key Bar Status
function updateApiKeyBarStatus(forceStatus = null) {
    const indicator = document.getElementById('apiStatusIndicator');
    const label = document.getElementById('apiStatusLabel');
    const barInput = document.getElementById('barApiKeyInput');

    if (!GEMINI_API_KEY) {
        indicator.className = 'status-indicator';
        label.textContent = 'AI: Not Configured';
        // Auto-expand if no key is configured to prompt user
        const apiKeyBar = document.getElementById('apiKeyBar');
        if (apiKeyBar && !apiKeyBar.classList.contains('expanded')) {
            apiKeyBar.classList.add('expanded');
        }
        return;
    }

    if (forceStatus === 'active') {
        indicator.className = 'status-indicator active';
        label.textContent = 'AI: Gemini Pro Active';
    } else if (forceStatus === 'error') {
        indicator.className = 'status-indicator error';
        label.textContent = 'AI: Connection Error';
    } else {
        indicator.className = 'status-indicator fallback';
        label.textContent = 'AI: Key Configured';
    }

    if (barInput) barInput.value = GEMINI_API_KEY;
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});
