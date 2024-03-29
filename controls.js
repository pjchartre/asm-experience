const PLAYING = true;
const PAUSED = false;
const MIN_ZOOM_LEVEL = 1;
const MAX_ZOOM_LEVEL = 5;

const VALIDATE = true;
const INVALIDATE = false;

let scenario = null;
let index = -1;

let isPlaying = false;
let playPauseElement, fromStartElement, toEndElement, stepBackElement, stepForwardElement;
let videoElement, timeBarElement;
let videoDuration = 0;
let videoSrcIsChanging = false;
let currentRate = 1;
let currentZoomLevel = 1;
let isDragging = false, original = {x: 0, y: 0, offset: {x: 0, y: 0}};
let offset = {x: 0, y: 0};
let originalVideoRect = {};

let timeout;
const TIMEOUT_DELAY = 90;


let game = [];

function togglePlayPause() {
    if (!isPlaying)
        play();
    else
        pause();
}

function play() {
    isPlaying = PLAYING;
    if (videoElement.ended) {
        rewind();
    }
    togglePlayIcon();
    playAllVideos();
}

function pause() {
    isPlaying = PAUSED;
    togglePlayIcon();
    pauseAllVideos();
}

function playAllVideos() {
    const videos = document.getElementById('main-container').querySelectorAll('video');
    [...videos].forEach(v => v.play());
}

function pauseAllVideos() {
    const videos = document.getElementById('main-container').querySelectorAll('video');
    [...videos].forEach(v => v.pause());
}

function togglePlayIcon() {
    const icon = playPauseElement.querySelector('i');
    if (isPlaying == PLAYING) {
        icon.classList.remove('bi-play');
        icon.classList.add('bi-pause');
    } else {
        icon.classList.remove('bi-pause');
        icon.classList.add('bi-play');
    }
}

function rewind() {
    const videos = document.getElementById('main-container').querySelectorAll('video');
    [...videos].forEach(v => v.currentTime = 0);
}

function forward() {
    const videos = document.getElementById('main-container').querySelectorAll('video');
    [...videos].forEach(v => {
        v.currentTime = v.duration;
        v.pause();
    });
}

function stepBack() {
    pause();
    timeBarElement.value = timeBarElement.value - 3;
    updateVideoFromPercent(timeBarElement.value);
}

function stepForward() {
    pause();
    timeBarElement.value = Number(timeBarElement.value) + 3;
    updateVideoFromPercent(timeBarElement.value);
}

function updateProgressBar(percent) {
    if (!videoSrcIsChanging) {
        document.getElementById('time-bar').value = percent;
    }
}

function reloadVideoMetaData() {
    videoDuration = videoElement.duration;
    videoElement.ontimeupdate = () => {
        const currentTime = videoElement.currentTime;
        const percent = currentTime / videoDuration * 1000;
        updateProgressBar(percent);
    }
    videoElement.onended = () => {
        pause();
        rewind();
    };
}

function goToVideoTime(videoTime, elem) {
    elem.currentTime = videoTime;
}

function updateVideoFromPercent(value) {
    const videos = document.getElementById('main-container').querySelectorAll('video');
    [...videos].forEach(v => {
        const videoTime = value / 1000 * v.duration;
        goToVideoTime(videoTime, v);
    });

}

function updateVideoSrc(src) {
    reinitZoomDrag();
    videoSrcIsChanging = true;
    const currentPercentage = videoElement.currentTime / videoElement.duration;
    videoElement.src = src;
    const newPercentage = +currentPercentage.toFixed(4);
    bindDurationChangeEventToVideo(newPercentage);
}

function bindClickEventToVideos() {
    const videosElements = document.getElementById('right-panel').querySelectorAll('video');
    [...videosElements].forEach(v => {
        v.onclick = () => updateVideoSrc(v.src);
    })
}

function bindDurationChangeEventToVideo(newPercentage) {
    videoElement.ondurationchange = () => {
        reloadVideoMetaData();
        if (newPercentage != null) {
            videoElement.currentTime = newPercentage * videoElement.duration;
            videoSrcIsChanging = false;
            if (isPlaying == PLAYING) {
                videoElement.play();
            }
        }
        videoElement.playbackRate = currentRate;
    }
}

function bindClickEventToRates() {
    const ratesElements = document.getElementById('rate-container').querySelectorAll('.button');
    [...ratesElements].forEach(b => {
        b.onclick = clickRate;
    })
}

function updateVideosRates(rate) {
    currentRate = rate;
    const videosElements = document.getElementById('main-container').querySelectorAll('video');
    [...videosElements].forEach(v => {
        v.playbackRate = rate;
    })
}

function clickRate(event) {
    let selectedRate = event.target.innerText;
    selectedRate = selectedRate.substring(1, selectedRate.length);
    updateVideosRates(selectedRate);
    const ratesElements = document.getElementById('rate-container').querySelectorAll('.button');
    [...ratesElements].forEach(b => {
        b.classList.remove('selected');
    })
    event.target.classList.add('selected');
}

function bindClickEventToZoomButtons() {
    document.getElementById('zoom-in-button').onclick = zoomIn;
    document.getElementById('zoom-out-button').onclick = zoomOut;
}

function zoomIn() {
    currentZoomLevel = Math.min(currentZoomLevel + 1, MAX_ZOOM_LEVEL);
    updateZoomLevel();
}

function zoomOut() {
    currentZoomLevel = Math.max(currentZoomLevel - 1, MIN_ZOOM_LEVEL);
    updateZoomLevel();
    checkAndUpdateVideoTransform();
}

function updateZoomLevel() {
    const zoomElement = document.getElementById('zoom-video-container');
    zoomElement.classList.remove(...zoomElement.classList);
    zoomElement.classList.add(`scale-${currentZoomLevel}x`);
}

function reinitZoomDrag() {
    const videoContainerElement = document.getElementById('zoom-video-container');
    videoElement.style = `transform: none`;
    currentZoomLevel = 1;
    original = {x: 0, y: 0, offset: {x: 0, y: 0}};
    updateZoomLevel();
}

function checkAndUpdateVideoTransform() {
    const containerElement = document.getElementById('video-container');
    const videoElement = containerElement.querySelector('video');
    const videoRect = videoElement.getBoundingClientRect();
    const rect = containerElement.getBoundingClientRect();
    let offsetX = original.offset.x;
    let offsetY = original.offset.y;
    if(videoRect.top > rect.top){
        const topDiff = videoRect.top - rect.top;
        offsetY = offsetY - Math.round(topDiff / currentZoomLevel);
    }
    else if(videoRect.bottom < rect.bottom){
        const bottomDiff = videoRect.bottom - rect.bottom;
        offsetY = offsetY - Math.round(bottomDiff / currentZoomLevel);
    }

    if(videoRect.left > rect.left){
        const leftDiff = videoRect.left - rect.left;
        offsetX = offsetX - Math.round(leftDiff / currentZoomLevel);
    }
    else if(videoRect.right < rect.right){
        const rightDiff = videoRect.right - rect.right;
        offsetX = offsetX - Math.round(rightDiff / currentZoomLevel);
    }

    original.offset.x = offsetX;
    original.offset.y = offsetY;
    offset.x = offsetX;
    offset.y = offsetY;
    videoElement.style = `transform: translate(${offsetX}px, ${offsetY}px)`;

}

function bindMouseEventToVideoContainer() {
    const videoContainerElement = document.getElementById('zoom-video-container');

    const onDown = (event) => {
                         const isTouch = /touch/.test(event.type);
                         const e = isTouch ? event.targetTouches[0] : event;
                         isDragging = true;
                         const containerElement = document.getElementById('video-container');
                         const videoElement = containerElement.querySelector('video');
                         const videoRect = videoElement.getBoundingClientRect();
                         const rect = containerElement.getBoundingClientRect();
                         original.x = e.clientX - rect.left;
                         original.y = e.clientY - rect.top;
                         originalVideoRect = {
                            top: videoRect.top,
                            bottom: videoRect.bottom,
                            left: videoRect.left,
                            right: videoRect.right
                         }
                     };
    const onMove = (event) => {
                         if (isDragging) {
                             const containerElement = document.getElementById('video-container');
                             const videoElement = containerElement.querySelector('video');
                             const rect = containerElement.getBoundingClientRect();
                             const isTouch = /touch/.test(event.type);
                             const e = isTouch ? event.targetTouches[0] : event;

                             const touchXValid = e.clientX >= rect.left && e.clientX <= rect.right;
                             const touchYValid = e.clientY >= rect.top && e.clientY <= rect.bottom;

                             if(!touchXValid || !touchYValid){
                                isDragging = false;
                                return;
                             }
                             const currentX = e.clientX - rect.left;
                             const currentY = e.clientY - rect.top;

                             const moved = {
                                x: currentX - original.x,
                                y: currentY - original.y
                             }

                             const simulatedVideoRect = {
                                left: originalVideoRect.left + (moved.x * currentZoomLevel),
                                right: originalVideoRect.right + (moved.x * currentZoomLevel),
                                top: originalVideoRect.top + (moved.y * currentZoomLevel),
                                bottom: originalVideoRect.bottom + (moved.y * currentZoomLevel)
                             }
                             const xValid = simulatedVideoRect.left <= rect.left && simulatedVideoRect.right >= rect.right;
                             const yValid = simulatedVideoRect.top <= rect.top && simulatedVideoRect.bottom >= rect.bottom;

                             if(xValid){
                                offset.x = moved.x + original.offset.x;
                             }

                             if(yValid){
                                offset.y = moved.y + original.offset.y;
                             }

                             videoElement.style = `transform: translate(${offset.x}px, ${offset.y}px)`;
                         }
                     };

    const onUp = (event) => {
                         isDragging = false;
                         original.offset.x = offset.x;
                         original.offset.y = offset.y;
                     };
    videoContainerElement.addEventListener('mousedown', onDown);
    videoContainerElement.addEventListener('touchstart', onDown);

    videoContainerElement.addEventListener('mousemove', onMove);
    videoContainerElement.addEventListener('touchmove', onMove);

    videoContainerElement.addEventListener('mouseup', onUp);
    videoContainerElement.addEventListener('touchend', onUp);

}

function showScenarioChooser() {
    idleDetection();
    document.getElementById('splash-screen').classList.add('hidden');
    document.getElementById('main-container').classList.add('hidden');
    document.getElementById('scenario-chooser').classList.remove('hidden');
}

function displayDecisionOverlay() {
    const overlayElement = document.getElementById('decision-overlay');
    overlayElement.classList.remove(...overlayElement.classList);
    overlayElement.classList.add('visible', 'step1');
}

function closeDecisionOverlay() {
    const overlayElement = document.getElementById('decision-overlay');
    overlayElement.classList.remove(...overlayElement.classList);
    document.getElementById('decision-overlay').querySelectorAll('video').forEach(e => {
        e.pause();
        e.currentTime = 0;
    });

    const totalScore = game.length;
    const answeredScenari = game.filter(s => s.answered).length;
    const correctAnswers = game.filter(s => s.correctAnswer).length;
    if(totalScore == answeredScenari) {
        computeFinalScore(correctAnswers, totalScore);
        document.getElementById('splash-screen').classList.add('hidden');
        document.getElementById('main-container').classList.add('hidden');
        document.getElementById('final-score').classList.remove('hidden');
    }
    else if(game[index].answered) {
        showScenarioChooser();
    }
}

function computeFinalScore(correctAnswers, totalScore) {
    document.querySelector('#final-score .score-'+correctAnswers).classList.remove('hidden');
    if(correctAnswers == totalScore) {
        fireConfettis();
    }
    document.getElementById('final-score-content').innerText = correctAnswers;
    document.getElementById('final-max-score-content').innerText = totalScore;
}

function fireConfettis() {
    setTimeout(() => {
        fire(0.25, {
          spread: 26,
          startVelocity: 55,
        });
        fire(0.2, {
          spread: 60,
        });
        fire(0.35, {
          spread: 100,
          decay: 0.91,
          scalar: 0.8
        });
        fire(0.1, {
          spread: 120,
          startVelocity: 25,
          decay: 0.92,
          scalar: 1.2
        });
        fire(0.1, {
          spread: 120,
          startVelocity: 45,
        });
    }, 500);
}

function fire(particleRatio, opts) {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 }
    };
  confetti({
    ...defaults,
    ...opts,
    particleCount: Math.floor(count * particleRatio)
  });
}

function makeDecision(validated) {
    let message = 'Bonne réponse';
    let classMessage = 'good-answer';
    let valid = true;
    if (game[index].isValid != validated) {
        message = 'Mauvaise réponse';
        classMessage = 'wrong-answer';
        valid = false;
    }

    game[index].answered = true;
    game[index].correctAnswer = valid;

    let scenarioList = document.querySelectorAll('#scenari-grid .scenario');
    scenarioList[index].classList.add('played');
    scenarioList[index].classList.add(valid ? 'correct' : 'incorrect');

    computeScore();

    const answerMessageElement = document.getElementById('answer-message');
    answerMessageElement.innerText = message;
    answerMessageElement.classList.remove(...answerMessageElement.classList);
    answerMessageElement.classList.add(classMessage);
    const overlayElement = document.getElementById('decision-overlay');
    overlayElement.classList.remove('step1');
    overlayElement.classList.add('step2');
}

function computeScore() {
    const totalScore = game.length;
    const answeredScenari = game.filter(s => s.answered).length;
    const correctAnswers = game.filter(s => s.correctAnswer).length;
    document.getElementById('current-score').innerText = correctAnswers;
    document.getElementById('max-score').innerText = answeredScenari;
    if(answeredScenari == 0) {
        document.getElementById('score').classList.add('hidden');
        document.getElementById('new-game').classList.add('hidden');
    }
    else {
        document.getElementById('score').classList.remove('hidden');
        document.getElementById('new-game').classList.remove('hidden');
    }
}

function reinitRate() {
    const ratesElements = document.getElementById('rate-container').querySelectorAll('.button');
    [...ratesElements].forEach(b => {
        b.classList.remove('selected');
    })
    ratesElements[0].classList.add('selected');
}

function selectedScenario(s, i) {
    pause();
    rewind();
    timeBarElement.value = 0;
    reinitRate();
    currentRate = 1;
    scenario = s;
    index = i;
    if(game[index].answered) {
        document.getElementById('popup').classList.remove('hidden');
    }
    else {
        reinitZoomDrag();
        document.querySelector('#zoom-video-container video').setAttribute('src', s.videos[0]);
        original = {x: 0, y: 0, offset: {x: 0, y: 0}};
        offset = {x: 0, y: 0};

        const videoElements = document.querySelectorAll('#right-panel video');
        for(let i = 0; i < videoElements.length; i++){
            videoElements[i].setAttribute('src', s.videos[i]);
        }

        document.getElementById('scenario-chooser').classList.add('hidden');
        document.getElementById('main-container').classList.remove('hidden');
        document.querySelector('#decision-overlay .decision-title').innerText = game[index].question;
        document.querySelector('#decision-overlay .answer-explanation video').setAttribute('src', game[index].explanationVideo);
    }
}

window.addEventListener('scenario-selected', (event) => {
    selectedScenario(event.detail.scenario, event.detail.index);
});

window.addEventListener('content-fetched', (event) => {
    contentFetched(event.detail.content);
});

window.addEventListener('cache-loading', (event) => {
    document.getElementById('loading-screen').classList.remove('hidden');
});

window.addEventListener('cache-done', (event) => {
    document.getElementById('loading-screen').classList.add('hidden');
});

function contentFetched(content) {
    game = content.map(s => {
        return {
            question: s.question,
            isValid: s.isValid,
            explanationVideo: s.explanationVideo,
            answered: false,
            correctAnswer: false
        }
    });
    computeScore();
}

function newGame() {
    document.getElementById('main-container').classList.add('hidden');
    document.getElementById('scenario-chooser').classList.add('hidden');
    document.getElementById('decision-overlay').classList.add('hidden');
    document.getElementById('final-score').classList.add('hidden');
    document.getElementById('splash-screen').classList.remove('hidden');
    document.querySelectorAll('#scenari-grid .scenario').forEach(c => {
        c.classList.remove('played', 'correct', 'incorrect');
    });

    document.querySelectorAll('#final-score .sub-text').forEach(c => {
        c.classList.remove('hidden');
        c.classList.add('hidden');
    });

    confetti.reset();


    game.forEach(s => {
        s.answered = false;
        s.correctAnswer = false;
    });

    computeScore();
    idleDetection();
}

function idleDetection() {
    resetTimeout();
    const events = ['load', 'mousemove', 'mousedown', 'touchstart', 'touchmove', 'click', 'keydown'];
    events.forEach(e => window.addEventListener(e, resetTimeout));
}

function resetTimeout() {
    clearTimeout(timeout);
    timeout = setTimeout(newGame, TIMEOUT_DELAY * 1000);
}

function fullScreen() {
    document.querySelector('html').requestFullscreen();
}

window.addEventListener('load', (event) => {

    videoElement = document.getElementById('video-container').querySelector('video');
    playPauseElement = document.getElementById('play-pause-button');
    fromStartElement = document.getElementById('from-start-button');
    toEndElement = document.getElementById('to-end-button');
    stepBackElement = document.getElementById('step-back-button');
    stepForwardElement = document.getElementById('step-forward-button');
    timeBarElement = document.getElementById('time-bar');

    playPauseElement.onclick = togglePlayPause;
    fromStartElement.onclick = rewind;
    toEndElement.onclick = forward;
    stepBackElement.onclick = stepBack;
    stepForwardElement.onclick = stepForward;

    bindDurationChangeEventToVideo();
    bindClickEventToVideos();
    bindClickEventToRates();
    bindClickEventToZoomButtons();
    bindMouseEventToVideoContainer();

    reloadVideoMetaData();
    timeBarElement.value = 0;
    timeBarElement.addEventListener('input', function () {
        updateVideoFromPercent(timeBarElement.value)
    }, false);

    document.getElementById('splash-screen').addEventListener('click', () => {
        fullScreen();
        showScenarioChooser();
    });
    document.getElementById('splash-screen').onclick = showScenarioChooser;
    document.getElementById('decision-button').onclick = displayDecisionOverlay;
    document.getElementById('close-button').onclick = closeDecisionOverlay;
    document.getElementById('validate-button').onclick = () => makeDecision(VALIDATE);
    document.getElementById('invalidate-button').onclick = () => makeDecision(INVALIDATE);

    document.getElementById('back-button').addEventListener('click', showScenarioChooser);
    document.getElementById('new-game').addEventListener('click', newGame);
    document.getElementById('popup').addEventListener('click', () => {
        document.getElementById('popup').classList.add('hidden');
    });
    document.getElementById('final-score').addEventListener('click', newGame);

});
