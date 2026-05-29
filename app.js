// 旅行回忆地图 - 百度地图版

// 数据结构
let travelData = { cities: [] };

// 百度地图实例
let map;
let geoc; // 逆地理编码
let markers = [];
let currentCityId = null;

// 百度地图回调 —— 由百度 API script 的 callback 参数调用
function baiduMapReady() {
    loadData();
    initMap();
    initForm();
    initMapAddForm();
    updateStats();
    updateCityList();
    updateTimeline();
    renderMarkers();
    createPetals();
}

// 兼容：如果百度 API 加载前 DOMContentLoaded 已触发
window.baiduMapReady = baiduMapReady;

// ========== 数据管理 ==========

function loadData() {
    const saved = localStorage.getItem('travelMemoryData');
    if (saved) travelData = JSON.parse(saved);
}

function saveData() {
    localStorage.setItem('travelMemoryData', JSON.stringify(travelData));
    updateStats();
    updateCityList();
    updateTimeline();
}

// ========== 地图初始化 ==========

function initMap() {
    // 创建百度地图实例，中心设在中国
    map = new BMap.Map('map');
    const point = new BMap.Point(104.1954, 35.8617);
    map.centerAndZoom(point, 5);
    map.enableScrollWheelZoom(true);

    // 添加常用控件
    map.addControl(new BMap.NavigationControl());
    map.addControl(new BMap.ScaleControl());
    map.addControl(new BMap.MapTypeControl());

    // 逆地理编码
    geoc = new BMap.Geocoder();

    // 点击地图事件 —— 核心交互
    map.addEventListener('click', function(e) {
        const lng = e.point.lng;
        const lat = e.point.lat;
        openAddPanel(lat, lng);
    });
}

// ========== 地图点击添加 ==========

function openAddPanel(lat, lng) {
    const panel = document.getElementById('add-panel');
    const overlay = document.getElementById('add-overlay');
    const locationEl = document.getElementById('add-location');

    // 设置隐藏字段
    document.getElementById('add-lat').value = lat;
    document.getElementById('add-lng').value = lng;

    // 设置默认日期为今天
    document.getElementById('add-date').value = new Date().toISOString().split('T')[0];

    // 清空表单
    document.getElementById('add-province').value = '';
    document.getElementById('add-city').value = '';
    document.getElementById('add-memory').value = '';
    document.getElementById('add-photos').value = '';

    // 显示面板
    panel.classList.add('active');
    overlay.classList.add('active');

    // 逆地理编码 —— 自动识别省份和城市
    locationEl.textContent = '🔍 正在识别位置...';
    const point = new BMap.Point(lng, lat);
    geoc.getLocation(point, function(rs) {
        if (rs && rs.addressComponents) {
            const ac = rs.addressComponents;
            const province = ac.province || '';
            const city = ac.city || ac.district || '';

            document.getElementById('add-province').value = province;
            document.getElementById('add-city').value = city;
            locationEl.textContent = `📍 ${province} · ${city} (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        } else {
            locationEl.textContent = `📍 坐标 (${lat.toFixed(4)}, ${lng.toFixed(4)}) - 请手动填写城市`;
        }
    });
}

function closeAddPanel() {
    document.getElementById('add-panel').classList.remove('active');
    document.getElementById('add-overlay').classList.remove('active');
}

function initMapAddForm() {
    document.getElementById('map-add-form').addEventListener('submit', async function(e) {
        e.preventDefault();

        const province = document.getElementById('add-province').value.trim();
        const city = document.getElementById('add-city').value.trim();
        const date = document.getElementById('add-date').value;
        const weather = document.getElementById('add-weather').value;
        const memory = document.getElementById('add-memory').value;
        const lat = parseFloat(document.getElementById('add-lat').value);
        const lng = parseFloat(document.getElementById('add-lng').value);
        const photoFiles = document.getElementById('add-photos').files;

        if (!province || !city) {
            showToast('⚠️ 请填写省份和城市');
            return;
        }

        // 处理照片
        const photos = [];
        for (let file of photoFiles) {
            const base64 = await fileToBase64(file);
            photos.push(base64);
        }

        // 创建记录
        const newCity = {
            id: Date.now().toString(),
            province, city, date, weather, memory, photos, lat, lng
        };

        travelData.cities.push(newCity);
        travelData.cities.sort((a, b) => new Date(b.date) - new Date(a.date));
        saveData();
        renderMarkers();

        closeAddPanel();
        showToast(`✨ ${province}·${city} 的回忆已保存！`);
    });
}

// ========== 手动添加表单 ==========

// 中国主要城市坐标（GCJ-02，百度会自动转换为 BD-09）
const cityCoordinates = {
    '济南': { lat: 36.6512, lng: 117.1201 }, '青岛': { lat: 36.0671, lng: 120.3826 },
    '北京': { lat: 39.9042, lng: 116.4074 }, '上海': { lat: 31.2304, lng: 121.4737 },
    '广州': { lat: 23.1291, lng: 113.2644 }, '深圳': { lat: 22.5431, lng: 114.0579 },
    '成都': { lat: 30.5728, lng: 104.0668 }, '重庆': { lat: 29.5630, lng: 106.5516 },
    '杭州': { lat: 30.2741, lng: 120.1551 }, '南京': { lat: 32.0603, lng: 118.7969 },
    '西安': { lat: 34.3416, lng: 108.9398 }, '武汉': { lat: 30.5928, lng: 114.3055 },
    '长沙': { lat: 28.2282, lng: 112.9388 }, '昆明': { lat: 25.0406, lng: 102.7125 },
    '大理': { lat: 25.6065, lng: 100.2679 }, '丽江': { lat: 26.8721, lng: 100.2299 },
    '三亚': { lat: 18.2528, lng: 109.5117 }, '厦门': { lat: 24.4798, lng: 118.0894 },
    '福州': { lat: 26.0745, lng: 119.2965 }, '贵阳': { lat: 26.6470, lng: 106.6302 },
    '哈尔滨': { lat: 45.8038, lng: 126.5340 }, '长春': { lat: 43.8171, lng: 125.3235 },
    '沈阳': { lat: 41.8057, lng: 123.4315 }, '大连': { lat: 38.9140, lng: 121.6147 },
    '天津': { lat: 39.1422, lng: 117.1749 }, '石家庄': { lat: 38.0428, lng: 114.5149 },
    '郑州': { lat: 34.7466, lng: 113.6254 }, '合肥': { lat: 31.8206, lng: 117.2272 },
    '南昌': { lat: 28.6829, lng: 115.8579 }, '太原': { lat: 37.8706, lng: 112.5489 },
    '兰州': { lat: 36.0611, lng: 103.8343 }, '西宁': { lat: 36.6171, lng: 101.7782 },
    '银川': { lat: 38.4872, lng: 106.2309 }, '呼和浩特': { lat: 40.8414, lng: 111.7519 },
    '南宁': { lat: 22.8170, lng: 108.3665 }, '海口': { lat: 20.0444, lng: 110.1999 },
    '拉萨': { lat: 29.6500, lng: 91.1409 }, '乌鲁木齐': { lat: 43.8256, lng: 87.6168 },
    '香港': { lat: 22.3193, lng: 114.1694 }, '澳门': { lat: 22.1987, lng: 113.5439 },
    '台北': { lat: 25.0330, lng: 121.5654 }
};

function initForm() {
    document.getElementById('add-city-form').addEventListener('submit', async function(e) {
        e.preventDefault();

        const province = document.getElementById('province-input').value;
        const city = document.getElementById('city-input').value;
        const date = document.getElementById('date-input').value;
        const weather = document.getElementById('weather-input').value;
        const memory = document.getElementById('memory-input').value;
        const photoFiles = document.getElementById('photo-input').files;

        // 获取坐标：先查预设，否则用百度地理编码查找
        let coords = cityCoordinates[city];
        if (!coords) {
            coords = await geocodeCity(province + city);
        }
        if (!coords) coords = { lat: 35.8617, lng: 104.1954 };

        const photos = [];
        for (let file of photoFiles) {
            photos.push(await fileToBase64(file));
        }

        const newCity = {
            id: Date.now().toString(),
            province, city, date, weather, memory, photos,
            lat: coords.lat, lng: coords.lng
        };

        travelData.cities.push(newCity);
        travelData.cities.sort((a, b) => new Date(b.date) - new Date(a.date));
        saveData();
        renderMarkers();

        // 平移到新标记
        map.panTo(new BMap.Point(coords.lng, coords.lat));

        this.reset();
        showToast(`✨ ${province}·${city} 的回忆已保存！`);
    });
}

// 百度地图地理编码
function geocodeCity(address) {
    return new Promise((resolve) => {
        if (!geoc) { resolve(null); return; }
        geoc.getPoint(address, function(point) {
            if (point) {
                resolve({ lat: point.lat, lng: point.lng });
            } else {
                resolve(null);
            }
        }, address);
    });
}

// ========== 工具函数 ==========

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
    });
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

// ========== 地图标记 ==========

function renderMarkers() {
    // 清除旧标记
    markers.forEach(m => map.removeOverlay(m));
    markers = [];

    travelData.cities.forEach(cityData => {
        const point = new BMap.Point(cityData.lng, cityData.lat);

        // 自定义粉色心形标记
        const myIcon = new BMap.Icon(
            // 使用 SVG data URI 作为心形图标
            'data:image/svg+xml,' + encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
                '<path d="M16 28C16 28 4 20 4 12C4 7.6 7.6 4 12 4C14.2 4 16 5.4 16 5.4C16 5.4 17.8 4 20 4C24.4 4 28 7.6 28 12C28 20 16 28 16 28Z" fill="#ff6b9d" stroke="#c9184a" stroke-width="1.5"/>' +
                '</svg>'
            ),
            new BMap.Size(32, 32),
            { anchor: new BMap.Size(16, 28), infoWindowAnchor: new BMap.Size(16, 4) }
        );

        const marker = new BMap.Marker(point, { icon: myIcon });
        map.addOverlay(marker);

        // 信息窗口内容
        const photoCount = cityData.photos ? cityData.photos.length : 0;
        const content = `
            <div class="info-window">
                <h4>❤️ ${cityData.city}</h4>
                <p>📅 ${cityData.date} ${cityData.weather || ''}</p>
                ${photoCount > 0 ? `<p>📸 ${photoCount} 张照片</p>` : ''}
                <button class="info-btn" onclick="openCityModal('${cityData.id}')">查看回忆 →</button>
            </div>
        `;

        const infoWindow = new BMap.InfoWindow(content, { width: 200, height: 120, offset: new BMap.Size(0, -10) });

        marker.addEventListener('click', function() {
            marker.openInfoWindow(infoWindow);
        });

        markers.push(marker);
    });
}

// ========== 更新 UI ==========

function updateStats() {
    const uniqueCities = new Set(travelData.cities.map(c => c.city)).size;
    const uniqueProvinces = new Set(travelData.cities.map(c => c.province)).size;
    const totalPhotos = travelData.cities.reduce((sum, c) => sum + (c.photos ? c.photos.length : 0), 0);

    document.getElementById('city-count').textContent = uniqueCities;
    document.getElementById('province-count').textContent = uniqueProvinces;
    document.getElementById('photo-count').textContent = totalPhotos;
    document.getElementById('trip-count').textContent = travelData.cities.length;
}

function updateCityList() {
    const list = document.getElementById('city-list');
    list.innerHTML = '';

    if (travelData.cities.length === 0) {
        list.innerHTML = '<li style="color: #888; text-align: center; padding: 2rem;">还没有旅行记录<br>点击地图开始添加吧 💕</li>';
        return;
    }

    travelData.cities.slice(0, 10).forEach(cityData => {
        const li = document.createElement('li');
        li.className = 'city-item';
        li.onclick = () => {
            openCityModal(cityData.id);
            // 平移到该城市
            map.panTo(new BMap.Point(cityData.lng, cityData.lat));
            map.setZoom(12);
        };
        li.innerHTML = `
            <span class="city-name">${cityData.province}·${cityData.city}</span>
            <span class="city-date">${formatDate(cityData.date)}</span>
        `;
        list.appendChild(li);
    });
}

function updateTimeline() {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '';

    if (travelData.cities.length === 0) {
        timeline.innerHTML = '<p style="color: #888; text-align: center; padding: 2rem;">时间线将在你添加第一段旅行后显示 ✈️</p>';
        return;
    }

    travelData.cities.forEach(cityData => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.style.cursor = 'pointer';
        item.onclick = () => openCityModal(cityData.id);
        item.innerHTML = `
            <div class="date">${formatDate(cityData.date)} ${cityData.weather || ''}</div>
            <div class="city-name">${cityData.province}·${cityData.city}</div>
            <div class="description">${cityData.memory || '没有留下文字记录...'}</div>
        `;
        timeline.appendChild(item);
    });
}

// ========== 城市详情模态框 ==========

function openCityModal(cityId) {
    const cityData = travelData.cities.find(c => c.id === cityId);
    if (!cityData) return;

    currentCityId = cityId;

    document.getElementById('modal-city-name').textContent = `${cityData.province}·${cityData.city}`;
    document.getElementById('modal-date').textContent = `📅 ${formatDate(cityData.date)}`;
    document.getElementById('modal-weather').textContent = cityData.weather || '';
    document.getElementById('modal-description').textContent = cityData.memory || '那天没有写下文字，但回忆都在心里。';

    // 渲染照片
    const photoContainer = document.getElementById('modal-photos');
    photoContainer.innerHTML = '';

    const photos = cityData.photos || [];
    if (photos.length === 0) {
        photoContainer.innerHTML = '<p style="color: #888; grid-column: 1/-1; text-align: center; padding: 2rem;">还没有上传照片</p>';
    } else {
        photos.forEach((photo, index) => {
            const div = document.createElement('div');
            div.className = 'photo-item';
            div.onclick = (e) => { e.stopPropagation(); showFullPhoto(photo); };
            div.innerHTML = `<img src="${photo}" alt="照片${index + 1}">`;
            photoContainer.appendChild(div);
        });
    }

    // 添加照片按钮
    const addBtn = document.createElement('div');
    addBtn.className = 'photo-item add-photo-btn';
    addBtn.textContent = '+';
    addBtn.onclick = (e) => { e.stopPropagation(); addPhotoToCity(cityId); };
    photoContainer.appendChild(addBtn);

    document.getElementById('city-modal').classList.add('active');
}

function closeModal(e) {
    if (e.target.id === 'city-modal') {
        document.getElementById('city-modal').classList.remove('active');
    }
}

function closeModalDirect() {
    document.getElementById('city-modal').classList.remove('active');
}

function showFullPhoto(photoSrc) {
    document.getElementById('photo-full').src = photoSrc;
    document.getElementById('photo-modal').classList.add('active');
}

function deleteCurrentCity() {
    if (!currentCityId) return;
    if (confirm('确定要删除这段回忆吗？删除后将无法恢复。')) {
        travelData.cities = travelData.cities.filter(c => c.id !== currentCityId);
        saveData();
        renderMarkers();
        closeModalDirect();
        showToast('🗑️ 已删除这段回忆');
    }
}

async function addPhotoToCity(cityId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async () => {
        const cityData = travelData.cities.find(c => c.id === cityId);
        if (!cityData) return;
        if (!cityData.photos) cityData.photos = [];
        for (let file of input.files) {
            cityData.photos.push(await fileToBase64(file));
        }
        saveData();
        renderMarkers();
        openCityModal(cityId);
    };
    input.click();
}

// ========== 花瓣动画 ==========

function createPetals() {
    const container = document.getElementById('petals');
    const petals = ['🌸', '🌹', '🌺', '💕', '✨', '🌷'];
    for (let i = 0; i < 20; i++) {
        const petal = document.createElement('div');
        petal.className = 'petal';
        petal.innerHTML = petals[Math.floor(Math.random() * petals.length)];
        petal.style.left = Math.random() * 100 + '%';
        petal.style.animationDuration = (Math.random() * 5 + 8) + 's';
        petal.style.animationDelay = Math.random() * 5 + 's';
        petal.style.fontSize = (Math.random() * 10 + 12) + 'px';
        container.appendChild(petal);
    }
}

// ========== 导航 ==========

function showSection(section) {
    const mapSection = document.getElementById('map-section');
    const timelineSection = document.getElementById('timeline-section');
    if (section === 'map') {
        mapSection.style.display = 'grid';
        timelineSection.style.display = 'none';
    } else if (section === 'timeline') {
        mapSection.style.display = 'none';
        timelineSection.style.display = 'block';
    }
}

// 暴露全局函数供 onclick 使用
window.baiduMapReady = baiduMapReady;
window.showSection = showSection;
window.openCityModal = openCityModal;
window.closeModal = closeModal;
window.closeModalDirect = closeModalDirect;
window.closeAddPanel = closeAddPanel;
window.addPhotoToCity = addPhotoToCity;
window.showFullPhoto = showFullPhoto;
window.deleteCurrentCity = deleteCurrentCity;
