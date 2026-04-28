// Modulo per future chiamate al database (AJAX/JSON)
const api = {
    async salva(dati) {
        console.log("Dati da inviare:", JSON.stringify(dati));
        return true;
    }
};

export default api;