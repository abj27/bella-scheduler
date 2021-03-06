/**
 * bellajs
 * @ndaidong
**/
"use strict";
((name, factory) => {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    let root = window || {};
    if (root.define && root.define.amd) {
      root.define([], factory);
    } else if (root.exports) {
      root.exports = factory();
    } else {
      root[name] = factory();
    }
  }
})('scheduler', () => {

  const MAX_TIMEOUT = 2147483647;

  var isUndefined = (v) => {
    return v === undefined; // eslint-disable-line no-undefined
  };

  var hasProperty = (ob, k) => {
    if (!ob || !k) {
      return false;
    }
    let r = true;
    if (isUndefined(ob[k])) {
      r = k in ob;
    }
    return r;
  };

  class BellaMap {
    constructor() {
      this.size = 0;
      this.data = {};
    }

    set(k, v) {
      let d = this.data;
      if (!hasProperty(d, k)) {
        this.size++;
      }
      d[k] = v;
      return this;
    }

    get(k) {
      let d = this.data;
      return d[k] || null;
    }

    all() {
      let d = this.data;
      let a = [];
      for (let k in d) {
        if (!isUndefined(d[k])) {
          a.push(d[k]);
        }
      }
      return a;
    }

    delete(k) {
      let d = this.data;
      if (!hasProperty(d, k)) {
        return false;
      }
      d[k] = null;
      delete d[k];
      this.size--;
      return true;
    }
  }

  var TaskList = new BellaMap();
  var checkTimer;

  var now = () => {
    return new Date();
  };

  var time = () => {
    return now().getTime();
  };

  var getIndex = (arr, item) => {
    let r = -1;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] === item) {
        r = i;
        break;
      }
    }
    return r;
  };

  var createId = (leng, prefix) => {
    let rn = () => {
      return Math.random().toString(36).slice(2);
    };
    let a = [];
    while (a.length < 10) {
      a.push(rn());
    }
    let r = a.join('');
    let t = r.length;
    let px = prefix || '';
    let ln = Math.max(leng || 32, px.length);
    let s = px;
    while (s.length < ln) {
      let k = Math.floor(Math.random() * t);
      s += r.charAt(k) || '';
    }
    return s;
  };

  var getNextDay = (t, tday) => {
    let d = new Date(t);
    d.setDate(d.getDate() + tday + 7 - d.getDay() % 7);
    return d;
  };

  var getDT1 = (mat, lastTick) => {

    let delta = 0;
    let passed = time() - lastTick;

    if (!mat) {
      return -1;
    }
    let v = parseInt(mat[1], 10);
    let s = mat[2];
    if (s === 's') {
      delta = 1000;
    } else if (s === 'm') {
      delta = 6e4;
    } else if (s === 'h') {
      delta = 6e4 * 60;
    } else if (s === 'd') {
      delta = 6e4 * 60 * 24;
    }
    delta *= v;
    return delta - passed;
  };

  var getDT2 = (mat) => {
    let wds = 'sun|mon|tue|wed|thu|fri|sat'.split('|');
    let today = new Date();
    let wday = today.getDay();

    let awd = wds[wday];
    let awi = getIndex(awd, wds);

    let dd = mat[1].toLowerCase();
    let ddi = getIndex(dd, wds);

    let hh = 0;
    let ii = 0;
    let ss = 0;
    if (mat[2]) {
      hh = parseInt(mat[2], 10);
    }
    if (mat[3]) {
      ii = parseInt(mat[3].replace(/\D/gi, ''), 10);
    }
    if (mat[4]) {
      ss = parseInt(mat[4].replace(/\D/gi, ''), 10);
    }

    today.setHours(hh);
    today.setMinutes(ii);
    today.setSeconds(ss);

    let ttime = today.getTime();
    let ctime = time();

    let nextDay = today;
    if (ddi < awi || ctime > ttime) {
      nextDay = getNextDay(today, awi);
    }
    nextDay.setHours(hh);
    nextDay.setMinutes(ii);
    nextDay.setSeconds(ss);

    return nextDay.getTime() - ctime;
  };

  var getDT3 = (mat) => {  // eslint-disable-line complexity

    let yy = mat[1] === '*' ? '*' : parseInt(mat[1], 10);
    let mm = mat[2] === '*' ? '*' : parseInt(mat[2], 10);
    let dd = mat[3] === '*' ? '*' : parseInt(mat[3], 10);
    let hh = mat[4] === '*' ? '*' : parseInt(mat[4], 10);
    let ii = mat[5] === '*' ? '*' : parseInt(mat[5], 10);
    let ss = mat[6] === '*' ? '*' : parseInt(mat[6], 10);

    let today = new Date();
    let ayy = today.getFullYear();

    if (yy !== '*' && yy < ayy) {
      return -1;
    }

    let tyy = yy;
    let tmm = mm;
    let tdd = dd;
    let thh = hh;
    let tii = ii;
    let tss = ss;

    if (yy === '*') {
      tyy = ayy;
    }

    let amm = today.getMonth() + 1;
    if (mm === '*') {
      tmm = amm;
    }
    let add = today.getDate();
    if (dd === '*') {
      tdd = add;
    }
    let ahh = today.getHours();
    if (hh === '*') {
      thh = ahh;
    }
    let aii = today.getMinutes();
    if (ii === '*') {
      tii = aii;
    }

    let gd = new Date(tyy, tmm - 1, tdd, thh, tii, tss);
    let ttime = gd.getTime();
    let ctime = time();
    let delta = ttime - ctime;

    if (delta < 0) {
      if (ii === '*') {
        gd.setMinutes(tii + 1);
        ttime = gd.getTime();
        delta = ttime - ctime;
      }
    }
    if (delta < 0) {
      if (hh === '*') {
        gd.setHours(thh + 1);
        ttime = gd.getTime();
        delta = ttime - ctime;
      }
    }
    if (delta < 0) {
      if (dd === '*') {
        gd.setDate(tdd + 1);
        ttime = gd.getTime();
        delta = ttime - ctime;
      }
    }

    if (delta < 0) {
      if (mm === '*') {
        gd.setMonth(tmm);
        ttime = gd.getTime();
        delta = ttime - ctime;
      }
    }

    if (delta < 0) {
      if (yy === '*') {
        gd.setFullYear(tyy + 1);
        ttime = gd.getTime();
        delta = ttime - ctime;
      }
    }

    return delta;
  };

  var getDelayTime = (pat, lastTick) => {

    let pt1 = /^(\d+)\s?(d|h|m|s)+$/i;
    let pt2 = /^(sun|mon|tue|wed|thu|fri|sat)+\w*\s+(\d+)(:\d+)?(:\d+)?$/i;
    let pt3 = /^(\*|\d+)\s+(\*|\d+)\s+(\*|\d+)\s+(\*|\d+)\s+(\*|\d+)\s+(\d+)$/i;

    let mat = pat.match(pt1);
    if (mat) {
      return getDT1(mat, lastTick);
    }

    mat = pat.match(pt2);
    if (mat) {
      return getDT2(mat);
    }

    mat = pat.match(pt3);
    if (mat) {
      return getDT3(mat);
    }

    return -1;
  };

  var execute = (task) => {
    task.fn();
    let id = task.id;
    if (!task.repeat) {
      return TaskList.delete(id);
    }

    let t = time();
    task.lastTick = t;
    TaskList.set(id, task);
    return true;
  };

  var updateTimer = () => {
    if (TaskList.size > 0) {
      let minDelay = MAX_TIMEOUT;
      let candidates = [];
      TaskList.all().forEach((task) => {
        let id = task.id;
        let delay = getDelayTime(task.time, task.lastTick);
        if (delay < 0) {
          TaskList.delete(id);
        } else if (delay === 0) {
          task.delay = 0;
          candidates.push(task);
        } else {
          task.delay = delay;
          TaskList.set(id, task);
          if (delay <= minDelay) {
            minDelay = delay;
            let arr = [];
            arr = candidates.concat(task);
            candidates = arr.filter((item) => {
              return item.delay <= minDelay;
            });
          }
        }
      });
      if (checkTimer) {
        clearTimeout(checkTimer);
      }
      if (candidates.length) {
        checkTimer = setTimeout(() => {
          candidates.map(execute);
          setTimeout(updateTimer, 1);
        }, minDelay);
      }

    }
  };

  var register = (t, fn, once) => {
    let rep = once ? 0 : 1;
    let n = time();
    let id = createId(32);
    let task = {
      id,
      fn,
      time: t,
      repeat: rep,
      createdAt: n,
      lastTick: n,
      delay: 0
    };
    TaskList.set(id, task);
    updateTimer();
  };

  return {
    yearly(t, fn) {
      let pt = '* ' + t;
      register(pt, fn);
    },
    monthly(t, fn) {
      let pt = '* * ' + t;
      register(pt, fn);
    },
    daily(t, fn) {
      let pt = '* * * ' + t;
      register(pt, fn);
    },
    hourly(t, fn) {
      let pt = '* * * * ' + t;
      return register(pt, fn);
    },
    every(t, fn) {
      return register(t, fn);
    },
    once(t, fn) {
      return register(t, fn, 1);
    }
  };
});
