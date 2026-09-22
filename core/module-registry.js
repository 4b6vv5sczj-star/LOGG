window.LOGG=window.LOGG||{};
LOGG.version='0.8.0';
LOGG.modules=LOGG.modules||{};
LOGG.registerModule=(id,module)=>{LOGG.modules[id]=Object.freeze({...module,id});};
