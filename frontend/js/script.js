document.addEventListener("DOMContentLoaded", () => {

  /* ========================================== */
  /* NOTE: signup.html supplies its own form handler. */
  /* Avoid duplicate signup submission logic here. */
  /* ========================================== */

  /* ========================================== */
  /* CURSOR-FOLLOWING BUTTON ANIMATION          */
  /* ========================================== */
  const buttons = document.querySelectorAll(".cta, .join, .btn-get-started, .signup-btn, .verify-btn, .login-btn");

  buttons.forEach(btn => {
    btn.addEventListener("mousemove", (e) => {
      const rect = btn.getBoundingClientRect();

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const moveX = (x - rect.width / 2) / 5;
      const moveY = (y - rect.height / 2) / 5;

      // Disable transition during move to prevent stuttering
      btn.style.transition = "transform 0.1s linear";
      btn.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
    });

    btn.addEventListener("mouseleave", () => {
      // Re-enable transition for smooth snap-back
      btn.style.transition = "transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
      btn.style.transform = "translate(0, 0) scale(1)";
    });
  });

  /* ========================================== */
  /* FILE UPLOAD TEXT UPDATER                   */
  /* ========================================== */
  const fileInput = document.getElementById('scan-upload');
  const fileLabel = document.querySelector('.file-upload-btn');

  if (fileInput && fileLabel) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        fileLabel.textContent = e.target.files[0].name;
        fileLabel.style.color = "#3D3D3D"; 
        fileLabel.style.borderColor = "#00A4F4";
        fileLabel.style.background = "#f0f9ff";
      }
    });
  }

  /* ========================================== */
  /* BACK TO TOP BUTTON                         */
  /* ========================================== */
  const topBtn = document.getElementById("scrollToTop");
  if (topBtn) {
    topBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ========================================== */
  /* PASSWORD TOGGLE LOGIC                      */
  /* ========================================== */
  function setupPasswordToggle(toggleId, inputId) {
    const toggleBtn = document.querySelector(toggleId);
    const passwordInput = document.querySelector(inputId);

    if (toggleBtn && passwordInput) {
      // Inline styles to ensure it's clickable
      toggleBtn.style.cursor = "pointer";
      toggleBtn.style.userSelect = "none";
      
      toggleBtn.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.textContent = type === 'password' ? 'Show' : 'Hide';
      });
    }
  }

  // Initialize toggles for all possible forms
  setupPasswordToggle('#toggleStepPassword', '#step-password');
  setupPasswordToggle('#togglePassword', '#password');
  setupPasswordToggle('#toggleSignupPassword', '#signup-password');

});

let selectedPatientId = null;
window.selectedPatientId = null;
let allPatients = [];

        // Load patients on startup only when the dashboard contains patient controls
        window.onload = () => {
            if (document.getElementById('patient-list')) {
                fetchPatients();
                const searchInput = document.getElementById('patient-search-input');

                if (searchInput) {
                    searchInput.addEventListener('input', handlePatientSearch);
                }

                const statusToggle = document.getElementById('toggle-patient-status');
                if (statusToggle) {
                    statusToggle.onclick = () => {
                        const selectedPatient = allPatients.find(p => p.id === selectedPatientId);
                        if (!selectedPatient) return alert('Select a patient first.');
                        const nextStatus = selectedPatient.status === 'closed' ? 'active' : 'closed';
                        updatePatientStatus(selectedPatientId, nextStatus);
                    };
                }
            }
        };

        async function fetchPatients() {
            const res = await fetch('/get_patients');
            const patients = await res.json();
            allPatients = patients;
            renderPatientList(patients);
        }

        function renderPatientList(patients) {
            const list = document.getElementById('patient-list');
            if (!list) return;

            const visible = patients
                .sort((a, b) => {
                    const statusWeight = { active: 2, closed: 0 };
                    const statusDiff = (statusWeight[b.status] || 0) - (statusWeight[a.status] || 0);
                    if (statusDiff !== 0) return statusDiff;
                    const severityDiff = (b.severity_score || 0) - (a.severity_score || 0);
                    if (severityDiff !== 0) return severityDiff;
                    return a.name.localeCompare(b.name);
                });

            list.innerHTML = '';
            if (!visible.length) {
                list.innerHTML = '<p class="placeholder-text">No patient profiles yet.</p>';
                return;
            }

            visible.forEach(p => {
                const triageLabel = p.triage_level && p.triage_level !== 'none' ? `<span class="triage-badge ${p.triage_level}">${p.triage_level}</span>` : '';
                const statusBadge = p.status && p.status !== 'active' ? `<span class="patient-status-label ${p.status}">${p.status}</span>` : '';
                const item = document.createElement('div');
                item.className = 'patient-item';
                item.innerHTML = `
                    <div class="patient-item-content">
                        <div class="patient-item-top">
                            <h4>${p.name}</h4>
                            <div class="patient-badges">
                                ${triageLabel}
                                ${statusBadge}
                            </div>
                        </div>
                        <p>ID: ${p.display_id}</p>
                    </div>
                    <button class="patient-delete-btn" title="Delete patient">×</button>
                `;
                item.onclick = (event) => selectPatient(p, event);
                item.querySelector('.patient-delete-btn').onclick = async (event) => {
                    event.stopPropagation();
                    await deletePatient(p.id);
                };
                list.appendChild(item);
            });
        }

        function filterPatients(query) {
            const term = (query || '').trim().toLowerCase();
            const filtered = !term ? allPatients : allPatients.filter(p => {
                return p.name.toLowerCase().includes(term) || p.display_id.toLowerCase().includes(term);
            });
            return filtered;
        }

        function handlePatientSearch() {
            const query = document.getElementById('patient-search-input').value;
            renderPatientList(filterPatients(query));
        }

        function selectPatient(patient, event) {
            selectedPatientId = patient.id;
            window.selectedPatientId = patient.id;
            const nameEl = document.getElementById('active-patient-name');
            const metaEl = document.getElementById('active-patient-meta');
            const statusEl = document.getElementById('active-patient-status');
            const toggleBtn = document.getElementById('toggle-patient-status');
            if (nameEl) nameEl.innerText = patient.name;
            if (metaEl) metaEl.innerText = `ID: ${patient.display_id}`;
            if (statusEl) statusEl.innerText = patient.status || 'active';
            if (toggleBtn) {
                toggleBtn.innerText = patient.status === 'closed' ? 'Reopen Case' : 'Close Case';
            }
            loadHistory(patient.id);
            
            // Highlight selected in list
            document.querySelectorAll('.patient-item').forEach(el => el.classList.remove('active'));
            if (event?.currentTarget) {
                event.currentTarget.classList.add('active');
            }
        }

        async function runAnalysis() {
            if (!selectedPatientId) return alert("Please select a patient profile first.");
            
            const fileInput = document.getElementById('file-input');
            if (!fileInput || !fileInput.files[0]) return alert("Please select an image.");

            const btn = document.getElementById('run-inference');
            if (btn) {
                btn.innerText = "Analyzing...";
                btn.disabled = true;
            }

            const formData = new FormData();
            formData.append('image', fileInput.files[0]);
            formData.append('condition', document.getElementById('model-selector').value);
            formData.append('patient_id', selectedPatientId);

            try {
                const res = await fetch('/predict', { method: 'POST', body: formData });
                const data = await res.json();
                
                if (data.image) {
                    const resultDisplay = document.getElementById('result-display');
                    if (resultDisplay) {
                        resultDisplay.innerHTML = `<img src="data:image/jpeg;base64,${data.image}" style="max-height:100%; width: auto;">`;
                    }
                    const placeholder = document.querySelector('.placeholder-text');
                    if (placeholder) placeholder.style.display = "none";
                    loadHistory(selectedPatientId); // Refresh timeline
                }
            } catch (err) {
                alert("Error connecting to server.");
            } finally {
                if (btn) {
                    btn.innerText = "Start Analysis";
                    btn.disabled = false;
                }
            }
        }

        async function loadHistory(id) {
            const res = await fetch(`/get_history/${id}`);
            const history = await res.json();
            const container = document.getElementById('history-timeline');
            if (!container) return;
            container.innerHTML = history.length ? '' : '<p class="placeholder-text">No previous scans found.</p>';

            history.forEach(item => {
                const entry = document.createElement('div');
                entry.className = 'history-item';
                entry.innerHTML = `
                    <img src="/outputs/${item.image_url}" alt="Scan result">
                    <div class="history-item-info">
                        <strong>${item.name ? item.name : item.condition.toUpperCase()}</strong>
                        <span class="history-date">${item.date}</span>
                        <p class="history-note">${item.result_data}</p>
                    </div>
                    <button class="history-delete-btn" title="Delete scan">×</button>
                `;

                const previewImage = () => {
                    const resultDisplay = document.getElementById('result-display');
                    if (resultDisplay) {
                        resultDisplay.innerHTML = `<img src="/outputs/${item.image_url}" style="max-height:100%; width: auto;">`;
                    }
                    container.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
                    entry.classList.add('active');

                    const analysisDetailsCard = document.getElementById('analysis-details-card');
                    if (analysisDetailsCard) {
                        analysisDetailsCard.classList.remove('hidden');
                    }
                    window.currentAnalysisId = item.id;
                };

                entry.addEventListener('click', previewImage);
                entry.querySelector('.history-delete-btn').addEventListener('click', async (event) => {
                    event.stopPropagation();
                    await deleteAnalysis(item.id, selectedPatientId);
                });
                container.appendChild(entry);
            });
        }

        // Modal Helpers
        function openModal() {
            document.getElementById('new-patient-first-name').value = '';
            document.getElementById('new-patient-last-name').value = '';
            document.getElementById('patientModal').style.display = 'flex';
        }
        function closeModal() {
            document.getElementById('new-patient-first-name').value = '';
            document.getElementById('new-patient-last-name').value = '';
            document.getElementById('patientModal').style.display = 'none';
        }

        async function addPatient() {
            const firstName = document.getElementById('new-patient-first-name').value.trim();
            const lastName = document.getElementById('new-patient-last-name').value.trim();

            if (!firstName || !lastName) {
                return alert('Please enter both first and last names.');
            }

            const res = await fetch('/add_patient', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ first_name: firstName, last_name: lastName })
            });

            if (res.ok) {
                closeModal();
                fetchPatients();
            } else {
                const data = await res.json();
                alert(data.message || 'Unable to create patient profile.');
            }
        }

        async function deletePatient(id) {
            if (!confirm('Delete this patient profile and all associated scans?')) return;

            const res = await fetch(`/delete_patient/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                return alert(data.message || 'Unable to delete patient.');
            }

            if (selectedPatientId === id) {
                selectedPatientId = null;
                window.selectedPatientId = null;
                const nameEl = document.getElementById('active-patient-name');
                const metaEl = document.getElementById('active-patient-meta');
                const historyEl = document.getElementById('history-timeline');
                if (nameEl) nameEl.innerText = 'Select a patient profile to begin';
                if (metaEl) metaEl.innerText = 'Patient code will appear here.';
                if (historyEl) historyEl.innerHTML = '<p class="placeholder-text">Choose a patient to load history.</p>';
            }
            await fetchPatients();
        }

        async function deleteAnalysis(id, patientId) {
            if (!confirm('Delete this analysis entry?')) return;

            const res = await fetch(`/delete_analysis/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                return alert(data.message || 'Unable to delete analysis.');
            }
            if (patientId) loadHistory(patientId);
        }

        async function updatePatientStatus(patientId, status) {
            if (!patientId) return alert('Select a patient first.');
            const res = await fetch(`/update_patient_status/${patientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (!res.ok) {
                return alert(data.message || 'Unable to update patient status.');
            }
            const statusEl = document.getElementById('active-patient-status');
            const toggleBtn = document.getElementById('toggle-patient-status');
            if (statusEl) statusEl.innerText = data.status || 'active';
            if (toggleBtn) toggleBtn.innerText = data.status === 'closed' ? 'Reopen Case' : 'Close Case';
            await fetchPatients();
        }
