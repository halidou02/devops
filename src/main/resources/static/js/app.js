/**
 * Application de Gestion des Étudiants
 * Communication asynchrone avec l'API REST Spring Boot
 */

document.addEventListener('DOMContentLoaded', () => {
    // Configuration & Endpoints
    const API_URL = '/api/students';

    // État local de l'application
    let students = [];
    let isEditing = false;
    let currentStudentId = null;
    let pendingDeleteId = null;

    // Éléments DOM
    const studentsTableBody = document.getElementById('studentsTableBody');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const searchInput = document.getElementById('searchInput');
    const btnClearSearch = document.getElementById('btnClearSearch');
    const studentsCountLabel = document.getElementById('studentsCountLabel');

    // Métriques
    const statTotalStudents = document.getElementById('statTotalStudents');
    const statLatestRegistration = document.getElementById('statLatestRegistration');
    const statLatestUpdate = document.getElementById('statLatestUpdate');

    // Badge Statut API
    const apiStatusBadge = document.getElementById('apiStatusBadge');
    const apiStatusLabel = document.getElementById('apiStatusLabel');

    // Modale d'ajout/édition
    const studentModal = document.getElementById('studentModal');
    const studentForm = document.getElementById('studentForm');
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    const studentIdInput = document.getElementById('studentId');
    const inputNom = document.getElementById('inputNom');
    const inputPrenom = document.getElementById('inputPrenom');
    const inputDate = document.getElementById('inputDate');
    const btnSubmitStudent = document.getElementById('btnSubmitStudent');
    const btnSubmitText = document.getElementById('btnSubmitText');
    const btnSubmitSpinner = document.getElementById('btnSubmitSpinner');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnCancelModal = document.getElementById('btnCancelModal');
    const btnOpenAddModal = document.getElementById('btnOpenAddModal');
    const btnEmptyAdd = document.getElementById('btnEmptyAdd');
    const btnRefresh = document.getElementById('btnRefresh');

    // Modale de suppression
    const deleteModal = document.getElementById('deleteModal');
    const deleteMessage = document.getElementById('deleteMessage');
    const btnCancelDelete = document.getElementById('btnCancelDelete');
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');

    // Conteneur de notifications
    const toastContainer = document.getElementById('toastContainer');

    // Initialisation
    loadStudents();

    // ==========================================================================
    // Événements
    // ==========================================================================

    btnRefresh.addEventListener('click', () => {
        loadStudents();
        showToast('Données actualisées', 'info');
    });

    btnOpenAddModal.addEventListener('click', () => openModal(false));
    btnEmptyAdd.addEventListener('click', () => openModal(false));
    btnCloseModal.addEventListener('click', closeModal);
    btnCancelModal.addEventListener('click', closeModal);

    studentForm.addEventListener('submit', handleFormSubmit);

    btnCancelDelete.addEventListener('click', closeDeleteModal);
    btnConfirmDelete.addEventListener('click', handleConfirmDelete);

    searchInput.addEventListener('input', handleSearch);
    btnClearSearch.addEventListener('click', () => {
        searchInput.value = '';
        btnClearSearch.style.display = 'none';
        renderTable(students);
    });

    // Fermeture des modales avec la touche Échap
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
            closeDeleteModal();
        }
    });

    // Fermeture en cliquant sur l'arrière-plan
    studentModal.addEventListener('click', (e) => {
        if (e.target === studentModal) closeModal();
    });

    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteModal();
    });

    // ==========================================================================
    // Appels API & Chargement
    // ==========================================================================

    async function loadStudents() {
        showLoading(true);
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`Erreur réseau HTTP : ${response.status}`);
            }
            students = await response.json();
            setApiStatus(true);
            updateMetrics(students);
            renderTable(students);
        } catch (error) {
            console.error('Erreur lors de la récupération des étudiants :', error);
            setApiStatus(false);
            showToast('Impossible de contacter le serveur backend', 'error');
            renderTable([]);
        } finally {
            showLoading(false);
        }
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        // Validation simple
        const nom = inputNom.value.trim();
        const prenom = inputPrenom.value.trim();
        const dateVal = inputDate.value;

        let hasError = false;
        if (!nom) {
            setError('errorNom', 'Le nom est obligatoire');
            hasError = true;
        } else {
            clearError('errorNom');
        }

        if (!prenom) {
            setError('errorPrenom', 'Le prénom est obligatoire');
            hasError = true;
        } else {
            clearError('errorPrenom');
        }

        if (!dateVal) {
            setError('errorDate', 'La date est obligatoire');
            hasError = true;
        } else {
            clearError('errorDate');
        }

        if (hasError) return;

        // Préparation du payload
        const payload = {
            nom: nom,
            prenom: prenom,
            date: dateVal
        };

        setFormSubmitting(true);

        try {
            let response;
            if (isEditing) {
                // Modification (PUT)
                response = await fetch(`${API_URL}/${currentStudentId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // Création (POST)
                response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (!response.ok) {
                throw new Error(`Erreur HTTP lors de l'enregistrement : ${response.status}`);
            }

            const result = await response.json();
            showToast(isEditing ? 'Étudiant modifié avec succès' : 'Étudiant enregistré avec succès', 'success');
            closeModal();
            loadStudents();
        } catch (error) {
            console.error('Erreur de persistance :', error);
            showToast('Échec de l\'opération sur le serveur', 'error');
        } finally {
            setFormSubmitting(false);
        }
    }

    async function handleConfirmDelete() {
        if (!pendingDeleteId) return;

        try {
            const response = await fetch(`${API_URL}/${pendingDeleteId}`, {
                method: 'DELETE'
            });

            if (!response.ok && response.status !== 204) {
                throw new Error(`Échec de la suppression HTTP ${response.status}`);
            }

            showToast('Étudiant supprimé de la base de données', 'success');
            closeDeleteModal();
            loadStudents();
        } catch (error) {
            console.error('Erreur de suppression :', error);
            showToast('Erreur lors de la tentative de suppression', 'error');
        }
    }

    // ==========================================================================
    // Rendu du tableau & Affichage
    // ==========================================================================

    function renderTable(data) {
        studentsTableBody.innerHTML = '';

        if (!data || data.length === 0) {
            emptyState.style.display = 'flex';
            studentsCountLabel.textContent = '0 étudiant affiché';
            return;
        }

        emptyState.style.display = 'none';
        studentsCountLabel.textContent = `${data.length} étudiant${data.length > 1 ? 's' : ''} trouvé${data.length > 1 ? 's' : ''}`;

        data.forEach(student => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td><span class="id-badge">#${student.id}</span></td>
                <td><span class="student-name-bold">${escapeHtml(student.nom || '-')}</span></td>
                <td>${escapeHtml(student.prenom || '-')}</td>
                <td><span class="date-pill">${formatDate(student.date)}</span></td>
                <td><span class="date-pill">${formatDateTime(student.createdDate)}</span></td>
                <td><span class="date-pill">${formatDateTime(student.updateDate)}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="btn btn-icon-sm btn-action-edit" title="Modifier l'étudiant" onclick="window.appEditStudent(${student.id})">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="btn btn-icon-sm btn-action-delete" title="Supprimer l'étudiant" onclick="window.appDeleteStudent(${student.id}, '${escapeHtml(student.prenom || '')}', '${escapeHtml(student.nom || '')}')">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            `;

            studentsTableBody.appendChild(tr);
        });
    }

    function updateMetrics(list) {
        statTotalStudents.textContent = list.length;

        if (list.length > 0) {
            // Trier par createdDate ou id pour identifier les récents
            const sortedByCreated = [...list].sort((a, b) => new Date(b.createdDate || b.date) - new Date(a.createdDate || a.date));
            const latest = sortedByCreated[0];
            statLatestRegistration.textContent = `${latest.prenom} ${latest.nom}`;

            const sortedByUpdate = [...list].sort((a, b) => new Date(b.updateDate || 0) - new Date(a.updateDate || 0));
            const latestUpdated = sortedByUpdate[0];
            statLatestUpdate.textContent = formatDateTime(latestUpdated.updateDate || latestUpdated.createdDate);
        } else {
            statLatestRegistration.textContent = '-';
            statLatestUpdate.textContent = '-';
        }
    }

    function handleSearch() {
        const query = searchInput.value.trim().toLowerCase();
        if (query) {
            btnClearSearch.style.display = 'block';
        } else {
            btnClearSearch.style.display = 'none';
        }

        const filtered = students.filter(s => {
            const nom = (s.nom || '').toLowerCase();
            const prenom = (s.prenom || '').toLowerCase();
            return nom.includes(query) || prenom.includes(query);
        });

        renderTable(filtered);
    }

    // ==========================================================================
    // Modales & Formulaires
    // ==========================================================================

    function openModal(editMode = false, student = null) {
        isEditing = editMode;
        clearValidationErrors();

        if (editMode && student) {
            currentStudentId = student.id;
            modalTitle.textContent = `Modifier l'étudiant #${student.id}`;
            modalSubtitle.textContent = 'Mettre à jour les informations du profil';
            btnSubmitText.textContent = 'Enregistrer les modifications';

            studentIdInput.value = student.id;
            inputNom.value = student.nom || '';
            inputPrenom.value = student.prenom || '';
            inputDate.value = formatDateForInput(student.date);
        } else {
            currentStudentId = null;
            modalTitle.textContent = 'Ajouter un étudiant';
            modalSubtitle.textContent = 'Renseignez les champs ci-dessous pour créer le profil';
            btnSubmitText.textContent = 'Enregistrer';

            studentForm.reset();
            studentIdInput.value = '';
            inputDate.value = new Date().toISOString().split('T')[0];
        }

        studentModal.classList.add('active');
        studentModal.setAttribute('aria-hidden', 'false');
        inputNom.focus();
    }

    function closeModal() {
        studentModal.classList.remove('active');
        studentModal.setAttribute('aria-hidden', 'true');
        studentForm.reset();
        clearValidationErrors();
    }

    function openDeleteModal(id, prenom, nom) {
        pendingDeleteId = id;
        deleteMessage.textContent = `Confirmez-vous la suppression définitive du dossier de l'étudiant #${id} (${prenom} ${nom}) ?`;
        deleteModal.classList.add('active');
        deleteModal.setAttribute('aria-hidden', 'false');
    }

    function closeDeleteModal() {
        deleteModal.classList.remove('active');
        deleteModal.setAttribute('aria-hidden', 'true');
        pendingDeleteId = null;
    }

    // Exportation globale pour les boutons d'actions générés dans le HTML
    window.appEditStudent = (id) => {
        const found = students.find(s => s.id === id);
        if (found) openModal(true, found);
    };

    window.appDeleteStudent = (id, prenom, nom) => {
        openDeleteModal(id, prenom, nom);
    };

    // ==========================================================================
    // Utilitaires (Dates, Formatage, Notifications)
    // ==========================================================================

    function formatDate(val) {
        if (!val) return '-';
        const d = new Date(val);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function formatDateTime(val) {
        if (!val) return '-';
        const d = new Date(val);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatDateForInput(val) {
        if (!val) return '';
        const d = new Date(val);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showLoading(state) {
        loadingState.style.display = state ? 'flex' : 'none';
        if (state) emptyState.style.display = 'none';
    }

    function setFormSubmitting(isSubmitting) {
        btnSubmitStudent.disabled = isSubmitting;
        btnSubmitSpinner.style.display = isSubmitting ? 'inline-block' : 'none';
        btnSubmitText.style.display = isSubmitting ? 'none' : 'inline-block';
    }

    function setApiStatus(isOnline) {
        if (isOnline) {
            apiStatusBadge.classList.remove('error');
            apiStatusLabel.textContent = "Connecté à l'API";
        } else {
            apiStatusBadge.classList.add('error');
            apiStatusLabel.textContent = "API déconnectée";
        }
    }

    function setError(elementId, message) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = message;
            el.classList.add('active');
        }
    }

    function clearError(elementId) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = '';
            el.classList.remove('active');
        }
    }

    function clearValidationErrors() {
        clearError('errorNom');
        clearError('errorPrenom');
        clearError('errorDate');
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3500);
    }
});
