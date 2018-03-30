class Popup {
    constructor() {
        this.currentTabId = 0;
        this.whitelisted = false;
        this.domain = "";
    }
    static setToggleButton(e) {
        var t = document.querySelector(".toggle");
        if (t.classList.contains("disabled") && e || !t.classList.contains("disabled") && !e) {
            t.classList.toggle("disabled");
            Popup.toggleClassVisible("whitelisting", e);
            t.innerText = (e ? "Выключить БЛОК" : "Включить БЛОК")
        }
        t.innerText = (e ? "Выключить БЛОК" : "Включить БЛОК")
    }
    static toggleClassVisible(e, t) {
        for (var i = document.getElementsByClassName(e), s = 0; s < i.length; s++) i[s].style.display = t ? "block" : "none"
    }
    setWhitelistDisplay(e) {
        this.whitelisted = e;
        document.querySelector(".whitelisted").innerHTML = "На сайте <b>" + this.domain + "</b> скрипты не блокируются.";
        Popup.toggleClassVisible("dropdown", !e);
        Popup.toggleClassVisible("whitelist", !e);
        Popup.toggleClassVisible("unwhitelist", e);
        Popup.toggleClassVisible("whitelisted", e)
    }

    setDetectedVisible(e) {
        document.querySelector(".detected").style.display = e ? "block" : "none"
    }

    sendWhitelistUpdate(e) {
        var self = this;
        chrome['runtime'].sendMessage({
            type: "WHITELIST",
            time: e,
            tabId: self.currentTabId,
            whitelisted: self.whitelisted
        }, function(e) {
            self.setWhitelistDisplay(e);
            chrome['tabs'].reload(self.currentTabId)
        })
    };

    init() {
        var self = this;
        $(".toggle").on("click", function() {
            chrome['runtime'].sendMessage({
                type: "TOGGLE"
            }, function(e) {
                Popup.setToggleButton(e);
                chrome['tabs'].reload(self.currentTabId)
            })
        });
        $(".whitelist").on("click", function() {
            var e = document.querySelector(".dropdown").value;
            self.sendWhitelistUpdate(e)
        });
        $(".unwhitelist").on("click", function() {
            self.sendWhitelistUpdate()
        });


    }
}
$(function() {
    var po = new Popup();
    po.init();

    chrome['tabs'].query({
        currentWindow: true,
        active: true
    }, function(e) {
        if (e && e[0]) {
            po.currentTabId = e[0].id;
            chrome['runtime'].sendMessage({
                type: "GET_STATE",
                tabId: po.currentTabId
            }, function(e) {
                po.domain = e.domain;
                Popup.setToggleButton(e.toggle);
                po.setWhitelistDisplay(e.whitelisted);
                po.setDetectedVisible(e.detected)
            });
        }
    });


})