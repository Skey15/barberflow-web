const tokenInput = document.getElementById('admin-token');
const dateInput = document.getElementById('admin-date');
const saveTokenButton = document.getElementById('save-token');
const refreshButton = document.getElementById('refresh');
const statusText = document.getElementById('status');
const appointmentsEl = document.getElementById('appointments');

const STORAGE_KEY = 'barberflow_admin_token';

function setStatus(message, isError = true) {
  statusText.textContent = message;
  statusText.style.color = isError ? '#9e2b25' : '#0e7a45';
}

function getToken() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

function setTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  dateInput.value = `${year}-${month}-${day}`;
}

async function fetchAppointments() {
  const token = getToken();
  if (!token) {
    setStatus('Guarda un token valido para consultar el panel.');
    return;
  }

  const date = dateInput.value;
  if (!date) {
    setStatus('Selecciona una fecha.');
    return;
  }

  setStatus('Cargando agenda...', false);

  try {
    const query = new URLSearchParams({ date });
    const response = await fetch(`/api/admin/appointments?${query.toString()}`, {
      headers: {
        'x-admin-token': token
      }
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'No fue posible consultar citas');
    }

    renderAppointments(payload.appointments, token);
    setStatus(`Agenda cargada: ${payload.appointments.length} cita(s).`, false);
  } catch (error) {
    setStatus(error.message);
  }
}

function renderAppointments(appointments, token) {
  appointmentsEl.innerHTML = '';

  if (appointments.length === 0) {
    appointmentsEl.innerHTML = '<p>No hay citas para esta fecha.</p>';
    return;
  }

  appointments.forEach((appointment) => {
    const card = document.createElement('article');
    card.className = 'appointment';

    const statusOptions = ['confirmed', 'completed', 'cancelled', 'no_show']
      .map(
        (status) =>
          `<option value="${status}" ${status === appointment.status ? 'selected' : ''}>${status}</option>`
      )
      .join('');

    card.innerHTML = `
      <h3>${appointment.appointmentTime} · ${appointment.service?.name || 'Servicio eliminado'}</h3>
      <p><strong>Cliente:</strong> ${appointment.customerName}</p>
      <p><strong>Telefono:</strong> ${appointment.customerPhone}</p>
      <p><strong>Estado:</strong> ${appointment.status}</p>
      <div class="status-row">
        <select>
          ${statusOptions}
        </select>
        <button type="button">Guardar</button>
      </div>
    `;

    const select = card.querySelector('select');
    const saveButton = card.querySelector('button');

    saveButton.addEventListener('click', async () => {
      setStatus('Actualizando estado...', false);
      try {
        const response = await fetch(`/api/admin/appointments/${appointment._id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': token
          },
          body: JSON.stringify({ status: select.value })
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || 'No fue posible actualizar estado');
        }

        setStatus(`Estado actualizado a ${payload.status}.`, false);
        await fetchAppointments();
      } catch (error) {
        setStatus(error.message);
      }
    });

    appointmentsEl.appendChild(card);
  });
}

saveTokenButton.addEventListener('click', () => {
  const token = tokenInput.value.trim();
  if (!token) {
    setStatus('Ingresa un token valido.');
    return;
  }

  localStorage.setItem(STORAGE_KEY, token);
  setStatus('Token guardado.', false);
});

refreshButton.addEventListener('click', fetchAppointments);

(function init() {
  tokenInput.value = getToken();
  setTodayDate();
  fetchAppointments();
})();
