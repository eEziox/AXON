// 1. UI: Update "Choose Image" label when file is picked
const fileInput = document.getElementById('file-input');
if (fileInput) {
    fileInput.onchange = function() {
        const fileName = this.files[0] ? this.files[0].name : 'Choose Image';
        document.getElementById('file-name-display').innerText = fileName;
    };
}

// Logout function
function logout() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userEmail");
    window.location.href = "/";
}

// 2. Run AI Analysis
const runInferenceButton = document.getElementById('run-inference');
if (runInferenceButton) {
    runInferenceButton.onclick = async () => {
        const condition = document.getElementById('model-selector').value;
        if (!fileInput || !fileInput.files[0]) return alert('Upload a scan.');

        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        formData.append('condition', condition);

        document.getElementById('result-display').innerHTML = '<div class="loader" role="status" aria-label="Analyzing"></div>';

        try {
            const res = await fetch('/predict', { method: 'POST', body: formData });
            const data = await res.json();

            if (!res.ok) {
                const errorMessage = data?.error || data?.message || 'Prediction failed.';
                alert(errorMessage);
                document.getElementById('result-display').innerHTML = '<p class="placeholder-text">Prediction failed.</p>';
                return;
            }

            if (data.image) {
                document.getElementById('result-display').innerHTML = `<img src="data:image/jpeg;base64,${data.image}" style="max-height:100%; width: auto;">`;
            } else {
                document.getElementById('result-display').innerHTML = '<p class="placeholder-text">No prediction image returned.</p>';
            }

        } catch (e) {
            alert('Analysis failed. ' + (e.message || e));
            document.getElementById('result-display').innerHTML = '<p class="placeholder-text">Prediction failed.</p>';
        }
    };
}

