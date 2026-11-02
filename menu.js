// =========================
// 1. HTML要素を取得
// =========================

const menuButton = document.getElementById("menuButton");
const menuPanel = document.getElementById("menuPanel");
const contentPanel = document.getElementById("contentPanel");

const menuItems = document.querySelectorAll(".menu-item");
const pages = document.querySelectorAll(".page-content");


// =========================
// 2. メニューを開く
// =========================

function openMenu() {
    menuPanel.classList.add("active");
    contentPanel.classList.remove("active");

    menuButton.setAttribute("aria-expanded", "true");
}


// =========================
// 3. メニューを閉じる
// =========================

function closeMenu() {
    menuPanel.classList.remove("active");

    menuButton.setAttribute("aria-expanded", "false");
}


// =========================
// 4. 内容パネルを閉じる
// =========================

function closeContent() {
    contentPanel.classList.remove("active");

    pages.forEach(page => {
        page.classList.remove("active");
    });
}


// =========================
// 5. メニューボタンの動作
// =========================

menuButton.addEventListener("click", () => {

    const menuIsOpen = menuPanel.classList.contains("active");

    if (menuIsOpen) {

        // メニューが開いていたら閉じる
        closeMenu();

    } else {

        // メニューを開く
        openMenu();

    }

});


// =========================
// 6. メニュー項目の動作
// =========================

menuItems.forEach(item => {

    item.addEventListener("click", () => {

        // 選択したページのIDを取得
        const pageName = item.dataset.page;

        // すべてのページを非表示にする
        pages.forEach(page => {
            page.classList.remove("active");
        });

        // 選択したページを表示する
        const selectedPage = document.getElementById(pageName);

        if (!selectedPage) return;

        selectedPage.classList.add("active");

        // 内容パネルを表示する
        contentPanel.classList.add("active");

        // メニューを閉じる
        closeMenu();

        // スクロール位置を先頭に戻す
        const pageBody = selectedPage.querySelector(".page-body");

        if (pageBody) {
            pageBody.scrollTop = 0;
        }

    });

});


// =========================
// 7. 最初の表示状態
// =========================

// 最初はメニューも内容パネルも閉じる
closeMenu();
closeContent();