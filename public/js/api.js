'use strict';
const API_BASE = 'http://localhost:3000/api';
const api = {
  get token() { return localStorage.getItem('token'); },
  set token(v) { if(v) localStorage.setItem('token',v); else { localStorage.removeItem('token'); localStorage.removeItem('role'); } },
  get useMock() { return localStorage.getItem('mock') === '1'; },
  async request(method,path,body) {
    try {
      if(this.useMock) {
        if(!window.mockRequest) throw new Error('mock.js не подключён');
        return await window.mockRequest(method,path,body,this.token);
      }
      const headers={'Content-Type':'application/json'};
      if(this.token) headers.Authorization='Bearer '+this.token;
      let res;
      try { res=await fetch(API_BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}); }
      catch(e) { throw Object.assign(new Error('Нет связи с сервером. Проверьте, запущен ли бэкенд.'),{status:0}); }
      const text=await res.text();
      let data=null;
      if(text) { try { data=JSON.parse(text); } catch(e) { throw Object.assign(new Error('Сервер вернул некорректный JSON'),{status:res.status}); } }
      if(!res.ok || data?.error) {
        const er=data?.error;
        throw Object.assign(new Error(typeof er==='string'?er:(er?.message || 'Ошибка '+res.status)),{status:res.status});
      }
      return data && Object.hasOwn(data,'data') ? data.data : data;
    } catch(e) {
      if(e.status===401 && !['/login','/register'].includes(path)) {
        this.token=null;
        window.dispatchEvent(new Event('auth-expired'));
        if(location.hash!=='#/login') location.hash='#/login';
      }
      throw e;
    }
  },
  get(p) {return this.request('GET',p);},
  post(p,b) {return this.request('POST',p,b||{});},
  put(p,b) {return this.request('PUT',p,b||{});},
  patch(p,b) {return this.request('PATCH',p,b||{});},
  del(p) {return this.request('DELETE',p);}
};
