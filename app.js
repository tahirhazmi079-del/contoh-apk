/* Logic Sistem Digital RT 006 - v7.2.6 (Final Stable)
   Fitur: Akumulasi KK, Safety Bulk Delete, PWA Service Worker, & Smart Search
*/

let dataWarga = JSON.parse(localStorage.getItem('db_rt_v7_final')) || [];
let editIndex = null;

const fields = ['nik', 'no_kk', 'nama', 'tmpt_lahir', 'tgl_lahir', 'gender', 'status_mutasi', 'hub_keluarga', 'alamat'];

// --- 1. CORE SYSTEM & DASHBOARD ---
function updateDashboard() {
    localStorage.setItem('db_rt_v7_final', JSON.stringify(dataWarga));
    renderTabel();
    hitungRekapitulasi();
    updateListWargaSurat(); 
    
    const bulan = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
    const d = new Date();
    const periodeEl = document.getElementById('display-period');
    if(periodeEl) periodeEl.innerText = `${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

function hitungRekapitulasi() {
    // Fungsi hitung jiwa (case-insensitive)
    const getJiwa = (status, g) => dataWarga.filter(w => 
        String(w.status_mutasi).toLowerCase() === status.toLowerCase() && 
        String(w.gender).toUpperCase() === g.toUpperCase()
    ).length;
    
    // FUNGSI HITUNG KK (DIUBAH MENJADI AKUMULASI JUMLAH NOMOR KK)
    const getKK = (statuses) => {
        const filtered = dataWarga.filter(w => 
            statuses.includes(w.status_mutasi) && 
            w.no_kk && w.no_kk !== "" && w.no_kk !== "-" && w.no_kk !== "0"
        );
        // Mengembalikan jumlah total baris yang memiliki No. KK (Akumulasi)
        return filtered.length; 
    };

    const stats = {
        awalL: getJiwa('Tetap', 'L'), awalP: getJiwa('Tetap', 'P'),
        lahirL: getJiwa('Lahir', 'L'), lahirP: getJiwa('Lahir', 'P'),
        matiL: getJiwa('Mati', 'L'), matiP: getJiwa('Mati', 'P'),
        pindahL: getJiwa('Pindah', 'L'), pindahP: getJiwa('Pindah', 'P'),
        datangL: getJiwa('Datang', 'L'), datangP: getJiwa('Datang', 'P')
    };

    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    
    const kkAwal = getKK(['Tetap']);
    const kkAkhir = getKK(['Tetap', 'Lahir', 'Datang']);

    // Set Statistik Dashboard
    setVal('rekap-kk-awal', kkAwal);
    setVal('awal-l', stats.awalL); setVal('awal-p', stats.awalP);
    setVal('lahir-l', stats.lahirL); setVal('lahir-p', stats.lahirP);
    setVal('mati-l', stats.matiL); setVal('mati-p', stats.matiP);
    setVal('pindah-l', stats.pindahL); setVal('pindah-p', stats.pindahP);
    setVal('datang-l', stats.datangL); setVal('datang-p', stats.datangP);

    const akhirL = stats.awalL + stats.lahirL + stats.datangL;
    const akhirP = stats.awalP + stats.lahirP + stats.datangP;

    setVal('akhir-l', akhirL); setVal('akhir-p', akhirP);
    setVal('rekap-kk-akhir', kkAkhir);
    setVal('count-laki', akhirL); 
    setVal('count-perempuan', akhirP); 
    setVal('count-kk', kkAkhir); // Total Akumulasi di Kotak Biru
}

// --- 2. EXCEL & TEMPLATE ---
function downloadTemplate() {
    const header = [["NIK", "no_kk", "nama", "tmpt_lahir", "tgl_lahir", "gender", "status_mutasi", "hub_keluarga", "alamat"]];
    const ws = XLSX.utils.aoa_to_sheet(header);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DataWarga");
    XLSX.writeFile(wb, "Template_RT06.xlsx");
}

function importExcel(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        
        json.forEach(row => {
            if(row.NIK || row.nama) {
                dataWarga.push({
                    nik: String(row.NIK || row.nik || ""),
                    no_kk: String(row.no_kk || ""),
                    nama: String(row.nama || "").toUpperCase(),
                    tmpt_lahir: String(row.tmpt_lahir || ""),
                    tgl_lahir: String(row.tgl_lahir || ""),
                    gender: String(row.gender || "L").toUpperCase(),
                    status_mutasi: String(row.status_mutasi || "Tetap"),
                    hub_keluarga: String(row.hub_keluarga || ""),
                    alamat: String(row.alamat || "RT 006 / RW 003")
                });
            }
        });
        updateDashboard();
        alert("Data berhasil diimport!");
    };
    reader.readAsArrayBuffer(file);
}

// --- 3. DATABASE CRUD ---
function renderTabel() {
    const tbody = document.getElementById('tabel-warga-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    dataWarga.forEach((w, i) => {
        tbody.innerHTML += `
        <tr class="hover:bg-slate-50 border-b border-slate-100 transition-all">
            <td class="p-5 text-center font-bold text-slate-300">${i+1}</td>
            <td class="p-5">
                <div class="font-bold text-indigo-600 text-[11px]">${w.nik}</div>
                <div class="font-black uppercase text-slate-800 text-sm tracking-tight">${w.nama}</div>
            </td>
            <td class="p-5">
                <div class="text-[10px] font-bold text-slate-500">${w.tmpt_lahir || '-'}, ${w.tgl_lahir || '-'}</div>
                <div class="mt-1"><span class="px-2 py-0.5 rounded text-[8px] font-black border bg-indigo-50 text-indigo-600 border-indigo-100">${w.status_mutasi}</span></div>
            </td>
            <td class="p-5 text-center">
                <div class="flex justify-center gap-2">
                    <button onclick="siapkanEdit(${i})" class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white flex items-center justify-center transition-all"><i class="fas fa-edit text-[10px]"></i></button>
                    <button onclick="hapusData(${i})" class="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all"><i class="fas fa-trash text-[10px]"></i></button>
                </div>
            </td>
        </tr>`;
    });
}

function tambahData() {
    let obj = {};
    fields.forEach(f => {
        const el = document.getElementById(f);
        obj[f] = el ? el.value.trim() : (f === 'alamat' ? 'RT 006 / RW 003' : '-');
    });
    
    if(!obj.nama || !obj.nik) return alert("NIK dan Nama wajib diisi!");
    if(editIndex !== null) {
        dataWarga[editIndex] = obj;
        editIndex = null;
    } else {
        dataWarga.push(obj);
    }
    updateDashboard();
    fields.forEach(f => { if(document.getElementById(f)) document.getElementById(f).value = ''; });
}

function siapkanEdit(i) {
    editIndex = i;
    const w = dataWarga[i];
    fields.forEach(f => { if(document.getElementById(f)) document.getElementById(f).value = w[f]; });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hapusData(i) {
    if(confirm(`Hapus data ${dataWarga[i].nama}?`)) { dataWarga.splice(i, 1); updateDashboard(); }
}

function hapusSemuaData() {
    if (confirm("PERINGATAN! Anda akan menghapus SELURUH database. Lanjutkan?")) {
        const kode = prompt("Ketik 'HAPUS' untuk konfirmasi penghapusan permanen:");
        if (kode === "HAPUS") {
            dataWarga = [];
            updateDashboard();
            alert("Database telah dikosongkan.");
        }
    }
}

// --- 4. PDF & SURAT ---
function printRekap() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16).setFont(undefined, 'bold').text("LAPORAN MUTASI WARGA RT 006 / RW 003", 148, 20, {align: 'center'});
    doc.autoTable({ 
        html: '#main-report-table', 
        startY: 35, 
        theme: 'grid', 
        styles: {fontSize: 8, halign: 'center'},
        headStyles: {fillColor: [30, 30, 30]}
    });
    doc.save(`Laporan_RT06_${new Date().toLocaleDateString()}.pdf`);
}

function updateListWargaSurat() {
    const dl = document.getElementById('list-warga-nik');
    if(!dl) return;
    dl.innerHTML = '';
    const aktif = dataWarga.filter(w => ['Tetap', 'Lahir', 'Datang'].includes(w.status_mutasi));
    aktif.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.nik;
        opt.label = w.nama.toUpperCase();
        dl.appendChild(opt);
    });
}

function generateSuratPDF() {
    const inputNik = document.getElementById('pilih-warga-surat').value;
    const keperluan = document.getElementById('keperluan-surat').value;
    const w = dataWarga.find(item => item.nik === inputNik);
    
    if(!w) return alert("Pilih warga dari daftar NIK yang tersedia!");
    if(!keperluan) return alert("Harap isi keperluan surat!");
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    doc.setFontSize(14).setFont(undefined, 'bold').text("PENGURUS RUKUN TETANGGA 006 RW 003", 105, 20, {align: 'center'});
    doc.setFontSize(10).setFont(undefined, 'normal').text("KELURAHAN SAMPEL, KECAMATAN CONTOH, JAKARTA", 105, 25, {align: 'center'});
    doc.line(20, 28, 190, 28);
    
    doc.setFontSize(12).setFont(undefined, 'bold').text("SURAT PENGANTAR", 105, 45, {align: 'center'});
    
    let y = 65;
    const info = [["Nama Lengkap", `: ${w.nama}`], ["NIK", `: ${w.nik}`], ["TTL", `: ${w.tmpt_lahir}, ${w.tgl_lahir}`], ["Alamat", `: ${w.alamat}`]];
    info.forEach(line => { doc.text(line[0], 30, y); doc.text(line[1], 75, y); y += 8; });

    doc.text("Menerangkan bahwa warga tersebut bermaksud untuk:", 30, y + 10);
    doc.setFont(undefined, 'bold').text(keperluan.toUpperCase(), 35, y + 18);
    
    doc.setFont(undefined, 'normal').text(`Jakarta, ${new Date().toLocaleDateString('id-ID')}`, 140, y + 50);
    doc.text("Ketua RT 006,", 140, y + 58);

    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    document.getElementById('preview-area').innerHTML = `
        <div class="w-full p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
            <p class="text-indigo-900 font-bold mb-4 text-xs uppercase tracking-widest">Surat Berhasil Dibuat!</p>
            <a href="${pdfUrl}" download="Surat_${w.nama}.pdf" class="block w-full bg-indigo-600 text-white p-4 rounded-xl font-black text-center shadow-lg uppercase text-[10px]">Unduh File PDF</a>
        </div>`;
}

// --- 5. NAVIGASI & SEARCH ---
function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active-link'));
    document.getElementById('tab-' + id).classList.add('active');
    document.getElementById('nav-' + id).classList.add('active-link');
}

function cariWarga() {
    const s = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('#tabel-warga-body tr').forEach(r => {
        r.style.display = r.innerText.toLowerCase().includes(s) ? '' : 'none';
    });
}

// --- 6. PWA SERVICE WORKER REGISTRATION ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Aplikasi Offline Siap!'))
            .catch(err => console.log('Gagal memuat Service Worker', err));
    });
}

window.onload = updateDashboard;