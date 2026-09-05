const state = {
  services: [
    { name: 'Fade Premium', durationMinutes: 45, price: 18 },
    { name: 'Corte + Barba', durationMinutes: 60, price: 24 },
    { name: 'Corte Clasico', durationMinutes: 30, price: 12 }
  ],
  selectedService: null,
  selectedDate: null,
  selectedTime: null
};

const elements = {
  messages: document.getElementById('chat-messages'),
  controls: document.getElementById('chat-controls'),
  status: document.getElementById('status'),
  chatForm: document.getElementById('chat-form'),
  chatInput: document.getElementById('chat-input'),
  scrollProgress: document.getElementById('scroll-progress'),
  processSteps: document.querySelectorAll('.process-step')
};

const contactModal = document.getElementById('contact-modal');
const contactForm = document.getElementById('contact-form');

function openContactModal(plan) {
  document.getElementById('contact-plan').value = plan;
  const descriptions = {
    Starter: 'Hola, me interesa BarberFlow Starter para gestionar las reservas de mi negocio de forma sencilla por WhatsApp. Me gustaria conocer los siguientes pasos.',
    Flow: 'Hola, me interesa BarberFlow Flow para mi negocio. Quiero automatizar las reservas, enviar recordatorios y disponer del panel de control. Me gustaria recibir mas informacion.',
    Studio: 'Hola, me interesa BarberFlow Studio para gestionar varios locales y agendas profesionales. Me gustaria conocer como seria la configuracion y la puesta en marcha.'
  };
  document.getElementById('contact-message').value = descriptions[plan] || 'Quiero recibir informacion sobre BarberFlow.';
  contactModal.classList.add('visible');
  contactModal.setAttribute('aria-hidden', 'false');
  document.getElementById('contact-name').focus();
}

function closeContactModal() {
  contactModal.classList.remove('visible');
  contactModal.setAttribute('aria-hidden', 'true');
}

document.querySelectorAll('.price-action').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    openContactModal(link.closest('.price-card').querySelector('h3').textContent);
  });
});

contactModal.querySelector('.modal-close').addEventListener('click', closeContactModal);
contactModal.addEventListener('click', (event) => {
  if (event.target === contactModal) closeContactModal();
});
contactForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const plan = document.getElementById('contact-plan').value;
  const name = document.getElementById('contact-name').value.trim();
  const business = document.getElementById('contact-business').value.trim();
  const phone = document.getElementById('contact-phone').value.trim();
  const email = document.getElementById('contact-email').value.trim();
  const message = document.getElementById('contact-message').value.trim();
  const submitButton = contactForm.querySelector('.contact-submit');
  submitButton.disabled = true;
  submitButton.textContent = 'Enviando...';
  fetch('barberflow-web-production.up.railway.app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan, name, business, phone, email, message })
  }).then(async (response) => {
    if (!response.ok) throw new Error((await response.json()).error || 'No se pudo enviar');
    submitButton.textContent = 'Enviado correctamente';
    setTimeout(closeContactModal, 900);
  }).catch(() => {
    const subject = encodeURIComponent(`BarberFlow ${plan} · ${business}`);
    const body = encodeURIComponent(`Plan de interes: ${plan}\nNombre: ${name}\nNegocio: ${business}\nTelefono: ${phone}\nEmail: ${email}\n\nMensaje:\n${message}`);
    window.location.href = `mailto:ganivetcanosaul@gmail.com?subject=${subject}&body=${body}`;
    submitButton.disabled = false;
    submitButton.textContent = 'Preparar email';
  });
});

const demoSlots = ['09:00', '10:30', '12:00', '16:00', '17:30', '19:00'];

function setStatus(message, type = 'ok') {
  elements.status.textContent = message;
  elements.status.className = `status ${type}`;
}

function addMessage(text, author = 'bot') {
  const message = document.createElement('div');
  message.className = `chat-message ${author}`;
  message.textContent = text;
  elements.messages.appendChild(message);
  elements.messages.parentElement.scrollTop = elements.messages.parentElement.scrollHeight;
}

function clearControls() {
  elements.controls.innerHTML = '';
}

function addChoice(label, onClick, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `chat-choice ${className}`;
  button.textContent = label;
  button.addEventListener('click', onClick);
  elements.controls.appendChild(button);
}

function showServices() {
  clearControls();
  state.services.forEach((service) => {
    addChoice(`${service.name} · ${service.durationMinutes} min · $${service.price}`, () => {
      state.selectedService = service;
      addMessage(service.name, 'user');
      addMessage('Perfecto. Para que dia quieres venir?', 'bot');
      showDate();
    });
  });
}

function showDate() {
  clearControls();
  const date = document.createElement('input');
  date.type = 'date';
  date.className = 'chat-date';
  date.min = todayKey();
  elements.controls.appendChild(date);
  addChoice('Consultar horas disponibles', () => {
    if (!date.value) {
      setStatus('Elige un dia para continuar.', 'error');
      return;
    }
    state.selectedDate = date.value;
    addMessage(formatDate(date.value), 'user');
    addMessage('Estoy mirando los huecos que quedan...', 'bot');
    showSlots();
  }, 'primary');
}

function showSlots() {
  clearControls();
  addMessage(`Para ${formatDate(state.selectedDate)} tengo estas horas libres:`, 'bot');
  demoSlots.forEach((time) => {
    addChoice(time, () => {
      state.selectedTime = time;
      addMessage(time, 'user');
      addMessage(`Genial. Te apunto provisionalmente el ${formatDate(state.selectedDate)} a las ${time}.`, 'bot');
      showDemoConfirmation();
    });
  });
}

function showDemoConfirmation() {
  clearControls();
  addMessage('En una conversacion real, ahora te pediria tu nombre y confirmaria la cita por este chat.', 'bot');
  const note = document.createElement('div');
  note.className = 'chat-summary';
  note.innerHTML = `<strong>Simulacion completada</strong><span>${state.selectedService.name}</span><span>${formatDate(state.selectedDate)} · ${state.selectedTime}</span>`;
  elements.controls.appendChild(note);
  addChoice('Volver a empezar', restartDemo, 'primary');
  setStatus('Demo: no se ha creado ninguna reserva.', 'ok');
}

function restartDemo() {
  state.selectedService = null;
  state.selectedDate = null;
  state.selectedTime = null;
  elements.messages.innerHTML = '';
  setStatus('');
  addMessage('Hola, soy BarberFlow. Que servicio te apetece reservar?', 'bot');
  showServices();
}

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatDate(key) {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(new Date(`${key}T12:00:00`));
}

function updateScrollStage() {
  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
  const stage = Math.min(4, Math.floor(progress * 4) + 1);
  const phoneScale = 1;
  elements.scrollProgress.textContent = `${String(stage).padStart(2, '0')} / 04`;
  elements.processSteps.forEach((step, index) => step.classList.toggle('active', index === stage - 1));
  document.body.classList.toggle('is-scrolling', window.scrollY > 8);
  document.body.style.setProperty('--phone-scale', phoneScale.toFixed(3));
}

elements.chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = elements.chatInput.value.trim();
  if (!text) return;
  addMessage(text, 'user');
  elements.chatInput.value = '';
  addMessage('Soy una demo. Usa los botones del chat para ver como el local guiaria la reserva por WhatsApp.', 'bot');
});

addMessage('Hola, soy BarberFlow. Que servicio te apetece reservar?', 'bot');
showServices();
updateScrollStage();
window.addEventListener('scroll', updateScrollStage, { passive: true });
