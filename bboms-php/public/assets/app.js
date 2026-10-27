'use strict';
document.addEventListener('DOMContentLoaded',()=>{
  for(const form of document.querySelectorAll('form[data-confirm]')) {
    form.addEventListener('submit',(event)=>{
      if(!window.confirm(form.dataset.confirm||'Are you sure?')) event.preventDefault();
    });
  }
  document.querySelectorAll('[data-show-password]').forEach((button)=>{
    button.addEventListener('click',()=>{
      const field=document.getElementById('login-password');
      if(!field)return;
      const next=field.type==='password'?'text':'password';
      field.type=next;
      button.textContent=next==='text'?'Hide':'Show';
      button.setAttribute('aria-label',next==='text'?'Hide password':'Show password');
    });
  });
});
