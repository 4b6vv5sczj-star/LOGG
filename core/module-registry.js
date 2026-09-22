window.LOGG=window.LOGG||{};
LOGG.version='0.10.1';
LOGG.modules=LOGG.modules||{};
LOGG.registerModule=(id,module)=>{LOGG.modules[id]=Object.freeze({...module,id});};
