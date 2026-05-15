
// Initialize Audio and Voice Engines globally
const audioEngine = new AudioEngine();
const voiceEngine = new VoiceEngine();

function startGame() {
    audioEngine.init(); // Must be called upon user interaction
    audioEngine.playClick();
    quizEngine.start();
}

const quizEngine = {
    questions: [],
    currentIdx: 0,
    score: 0,
    timer: null,
    timeLeft: 30,
    timePerQ: 30,
    totalToPlay: 10,
    isAnswered: false,
    userAnswers: [],
    lifelines: { fiftyFifty: true, flip: true },

    start: function() {
        const count = document.getElementById('q-count').value;
        const time = document.getElementById('time-limit').value;
        
        this.timePerQ = (time === 'no-limit') ? 9999 : parseInt(time);
        this.totalToPlay = (count === 'all') ? questionBank.length : parseInt(count);
        
        this.questions = [...questionBank].sort(() => Math.random() - 0.5).slice(0, this.totalToPlay);
        
        this.currentIdx = 0;
        this.score = 0;
        this.isAnswered = false;
        this.userAnswers = [];
        this.lifelines = { fiftyFifty: true, flip: true };

        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('quiz-screen').classList.add('active');
        
        document.getElementById('ll-5050').classList.remove('used');
        document.getElementById('ll-flip').classList.remove('used');
        
        this.updateStreak();
        
        // Start cinematic sequence
        voiceEngine.speak("Let's play E E S KBC Master!", () => {
            this.loadQuestion();
        });
    },

    loadQuestion: function() {
        this.isAnswered = false;
        const q = this.questions[this.currentIdx];
        document.getElementById('current-q-num').innerText = this.currentIdx + 1;
        document.getElementById('q-text').innerText = q.q;
        
        const optionsGrid = document.getElementById('options-grid');
        optionsGrid.innerHTML = '';

        const prefix = ['A', 'B', 'C', 'D'];
        
        q.o.forEach((opt, idx) => {
            const btn = document.createElement('div');
            btn.className = 'kbc-option-box glow-hover';
            btn.id = 'opt-' + idx;
            btn.onclick = () => this.checkAnswer(idx);
            btn.onmouseover = () => audioEngine.playHover();
            
            btn.innerHTML = `<span class="opt-prefix">${prefix[idx]}:</span> <span class="opt-text">${opt}</span>`;
            optionsGrid.appendChild(btn);
        });

        // Audio sequence for new question
        audioEngine.startSuspenseBGM();
        
        // Read out the question and options
        let narrationText = `Question ${this.currentIdx + 1}: ${q.q}. `;
        q.o.forEach((opt, idx) => {
            narrationText += `Option ${prefix[idx]}: ${opt}. `;
        });
        voiceEngine.speak(narrationText);

        this.startTimer();
    },

    startTimer: function() {
        clearInterval(this.timer);
        this.timeLeft = this.timePerQ;
        this.updateTimerUI();
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerUI();
            
            if (!this.isAnswered) {
                audioEngine.playTick();
            }

            if (this.timeLeft <= 0) {
                clearInterval(this.timer);
                this.handleTimeout();
            }
        }, 1000);
    },

    updateTimerUI: function() {
        const timerEl = document.getElementById('timer-val');
        timerEl.innerText = this.timeLeft;
        const circle = document.querySelector('.timer-circle');
        if (this.timeLeft <= 5 && this.timeLeft > 0) {
            circle.style.borderColor = '#ef4444';
            circle.style.boxShadow = '0 0 30px #ef4444';
            timerEl.style.color = '#ef4444';
            timerEl.classList.add('pulse');
        } else {
            circle.style.borderColor = '#fbbf24';
            circle.style.boxShadow = '0 0 15px rgba(251, 191, 36, 0.4)';
            timerEl.style.color = '#fbbf24';
            timerEl.classList.remove('pulse');
        }
    },

    checkAnswer: function(selectedIdx) {
        if (this.isAnswered) return;
        
        const q = this.questions[this.currentIdx];
        const clickedBtn = document.getElementById('opt-' + selectedIdx);
        if (clickedBtn && clickedBtn.style.visibility === 'hidden') return;
        
        this.isAnswered = true;
        clearInterval(this.timer);
        voiceEngine.stop();
        audioEngine.stopSuspenseBGM();
        
        // Lock Kiya Jaye Dramatic Effect
        const prefix = ['A', 'B', 'C', 'D'];
        audioEngine.playLock();
        clickedBtn.classList.add('locked');
        clickedBtn.classList.add('pulse');
        
        voiceEngine.speak(`Option ${prefix[selectedIdx]} lock kiya jaye...`, () => {
            // Wait 2 seconds for suspense
            setTimeout(() => {
                clickedBtn.classList.remove('locked', 'pulse');
                
                if (selectedIdx === q.a) {
                    this.score++;
                    clickedBtn.classList.add('correct');
                    audioEngine.playCorrect();
                    voiceEngine.speak("Sahi jawab!");
                } else {
                    clickedBtn.classList.add('wrong');
                    document.getElementById('opt-' + q.a).classList.add('correct');
                    audioEngine.playWrong();
                    voiceEngine.speak("Galat jawab. The correct answer is Option " + prefix[q.a]);
                }
                
                this.userAnswers.push(selectedIdx);
                setTimeout(() => this.nextQuestion(), 4000); // 4 seconds delay to move to next
            }, 2500);
        });
    },

    handleTimeout: function() {
        if (this.isAnswered) return;
        this.isAnswered = true;
        voiceEngine.stop();
        audioEngine.stopSuspenseBGM();
        
        const q = this.questions[this.currentIdx];
        document.getElementById('opt-' + q.a).classList.add('correct');
        audioEngine.playWrong();
        voiceEngine.speak("Time's up! The correct answer was Option " + ['A','B','C','D'][q.a]);
        
        this.userAnswers.push(-1);
        setTimeout(() => this.nextQuestion(), 4000);
    },

    use5050: function() {
        if (!this.lifelines.fiftyFifty || this.isAnswered) return;
        audioEngine.playClick();
        this.lifelines.fiftyFifty = false;
        document.getElementById('ll-5050').classList.add('used');
        voiceEngine.speak("Computer mahashay, 50 50 lifeline ka istemal kiya jaye.");
        
        const q = this.questions[this.currentIdx];
        let wrongOptions = [0, 1, 2, 3].filter(i => i !== q.a);
        wrongOptions.sort(() => Math.random() - 0.5);
        
        setTimeout(() => {
            document.getElementById('opt-' + wrongOptions[0]).style.visibility = 'hidden';
            document.getElementById('opt-' + wrongOptions[1]).style.visibility = 'hidden';
        }, 1500);
    },

    useFlip: function() {
        if (!this.lifelines.flip || this.isAnswered) return;
        audioEngine.playClick();
        this.lifelines.flip = false;
        document.getElementById('ll-flip').classList.add('used');
        voiceEngine.speak("Question flip kiya jaye.");
        
        setTimeout(() => {
            const currentSet = this.questions.map(q => q.q);
            const available = [...questionBank].filter(q => !currentSet.includes(q.q));
            if (available.length > 0) {
                const newQ = available[Math.floor(Math.random() * available.length)];
                this.questions[this.currentIdx] = newQ;
                audioEngine.stopSuspenseBGM();
                voiceEngine.stop();
                this.loadQuestion();
            }
        }, 1500);
    },

    nextQuestion: function() {
        this.currentIdx++;
        if (this.currentIdx < this.questions.length) {
            this.loadQuestion();
        } else {
            this.showResults();
        }
    },

    showResults: function() {
        document.getElementById('quiz-screen').classList.remove('active');
        document.getElementById('result-screen').classList.add('active');
        audioEngine.stopSuspenseBGM();
        
        document.getElementById('res-score').innerText = this.score + ' / ' + this.totalToPlay;
        const accuracy = Math.round((this.score / this.totalToPlay) * 100);
        document.getElementById('res-accuracy').innerText = accuracy + '%';
        
        const msg = document.getElementById('performance-text');
        const wrongCount = this.totalToPlay - this.score;
        
        if (accuracy >= 90) {
            msg.innerText = `Exceptional! You're a true Crorepati! 🏆`;
            audioEngine.playCorrect();
            voiceEngine.speak("Adbhut! What an incredible performance. You are truly an E E S Master!");
        } else if (accuracy >= 70) {
            msg.innerText = `Great job! Solid knowledge. 👍`;
            voiceEngine.speak("Well done! You have a great understanding of the concepts.");
        } else {
            msg.innerText = `Keep studying! The hot seat awaits your improvement. 💪`;
            audioEngine.playWrong();
            voiceEngine.speak("You need a little more practice. Better luck next time.");
        }

        const reviewDiv = document.getElementById('results-review');
        reviewDiv.innerHTML = '<h3 style="margin-bottom:1rem; color:#fbbf24;">Detailed Review</h3>';
        
        const prefix = ['A','B','C','D'];
        this.questions.forEach((q, idx) => {
            const userAnsIdx = this.userAnswers[idx];
            const isCorrect = userAnsIdx === q.a;
            const item = document.createElement('div');
            item.className = 'review-item glow-hover';
            
            let optionsHTML = '';
            if (userAnsIdx === -1) {
                optionsHTML = `
                    <div class="review-ans user-choice">
                        <span class="status-badge wrong">Timed Out</span> No answer provided
                    </div>
                    <div class="review-ans correct-choice">
                        <span class="status-badge correct">Correct</span> ${prefix[q.a]}: ${q.o[q.a]}
                    </div>`;
            } else if (isCorrect) {
                optionsHTML = `
                    <div class="review-ans user-choice is-correct">
                        <span class="status-badge correct">Correct</span> ${prefix[q.a]}: ${q.o[q.a]}
                    </div>`;
            } else {
                optionsHTML = `
                    <div class="review-ans user-choice">
                        <span class="status-badge wrong">Your Answer</span> ${prefix[userAnsIdx]}: ${q.o[userAnsIdx]}
                    </div>
                    <div class="review-ans correct-choice">
                        <span class="status-badge correct">Correct Answer</span> ${prefix[q.a]}: ${q.o[q.a]}
                    </div>`;
            }

            item.innerHTML = `
                <div class="review-q">${idx + 1}. ${q.q}</div>
                <div class="review-ans-grid">
                    ${optionsHTML}
                </div>
            `;
            reviewDiv.appendChild(item);
        });
    },

    updateStreak: function() {
        const lastDate = localStorage.getItem('ees_kbc_last_date');
        const today = new Date().toDateString();
        let streak = parseInt(localStorage.getItem('ees_kbc_streak') || '0');

        if (lastDate) {
            const last = new Date(lastDate);
            const diff = Math.floor((new Date(today) - last) / (1000 * 60 * 60 * 24));
            
            if (diff === 1) {
                streak++;
            } else if (diff > 1) {
                streak = 1;
            }
        } else {
            streak = 1;
        }

        localStorage.setItem('ees_kbc_streak', streak);
        localStorage.setItem('ees_kbc_last_date', today);
        
        document.querySelector('.streak-val').innerText = `🔥 ${streak} Days`;
    }
};

window.onload = () => {
    const streak = localStorage.getItem('ees_kbc_streak') || '0';
    document.querySelector('.streak-val').innerText = `🔥 ${streak} Days`;
};
