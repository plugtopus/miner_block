const _extends = Object.assign || function(t) {
    for (var e = 1; e < arguments.length; e++) {
        var o = arguments[e];
        for (var n in o) Object.prototype.hasOwnProperty.call(o, n) && (t[n] = o[n])
    }
    return t
};


class Background {
    constructor() {
        this.defaultConfig = {
            toggle: true,
            whitelist: [{
                domain: "cnhv.co",
                expiration: 0
            }]
        };
        this.localConfig = JSON.parse(localStorage.getItem("config"));
        this.config = _extends({}, this.defaultConfig, this.localConfig);
        this.domains = [];
        this.detected = [];
    }

    saveConfig() {
        localStorage.setItem("config", JSON.stringify(this.config))
    }

    changeToggleIcon(t) {
        chrome.browserAction.setIcon({
            path: "/img/" + (t ? "128" : "128_off") + ".png"
        })
    }

    getDomain(t) {
        var e = t.match(/:\/\/(.[^/]+)/);
        return e ? e[1] : ""
    }

    getTimestamp() {
        return Math.floor(Date.now() / 1e3)
    }

    isDomainWhitelisted(t) {
        if (!t) return false;
        var e = this.config.whitelist.find(function(e) {
            return e.domain === t
        });
        return !!e && (!(0 !== e.expiration && e.expiration <= this.getTimestamp()) || (this.removeDomainFromWhitelist(t), false))
    }

    addDomainToWhitelist(t, e) {
        var self = this;
        if (t) {
            e = +e || 0;
            if (!self.isDomainWhitelisted(t)) {
                self.config.whitelist = [].concat(self._toConsumableArray(self.config.whitelist), [{
                    domain: t,
                    expiration: 0 === e ? 0 : self.getTimestamp() + 60 * e
                }]);
                this.saveConfig()
            }
        }
    }

    removeDomainFromWhitelist(t) {
        if (t) {
            this.config.whitelist = this.config.whitelist.filter((e) => {
                return e.domain !== t
            })
            this.saveConfig()
        }
    }

    runBlocker(t) {
        var e = t.split("\n");
        var self = this;
        chrome['webRequest'].onBeforeRequest.addListener((t) => {
            if (t.tabId < 0) return;

        chrome['browserAction'].setBadgeBackgroundColor({
            color: 'red',
            tabId: t.tabId
        });
        chrome['browserAction'].setBadgeText({
            text: "!",
            tabId: t.tabId
        });

        self.detected[t.tabId] = true;

        return self.config.toggle ? self.isDomainWhitelisted(self.domains[t.tabId]) ? (chrome.browserAction.setIcon({
            path: "img/128_noblock.png",
            tabId: t.tabId
        }), {
            cancel: false
        }) : (chrome['browserAction'].setIcon({
            path: "img/128_blocked.png",
            tabId: t.tabId
        }), {
            cancel: true
        }) : {
            cancel: false
        }

    }, {
            urls: e
        }, ["blocking"])
    }

    runFallbackBlocker() {
        var self = this;
        fetch(chrome['runtime'].getURL("blacklist.txt")).then(function(t) {
            t.text().then(function(t) {
                return self.runBlocker(t)
            })
        })
    };



    _toConsumableArray(t) {
        if (Array.isArray(t)) {
            for (var e = 0, o = Array(t.length); e < t.length; e++) o[e] = t[e];
            return o
        }
        return Array.from(t)
    }

    init() {
        this.runFallbackBlocker();
        var self = this;

    }
}

var bg = new Background();

bg.init();




chrome['tabs'].onUpdated.addListener(function(t, e, o) {
    bg.domains[t] = bg.getDomain(o.url);
    if ("loading" === e && bg.config.toggle) {
        chrome['browserAction'].setIcon({
            path: "img/128.png",
            tabId: t
        });
        bg.detected[bg.details.tabId] = false;
        chrome['browserAction'].setBadgeText({
            text: "",
            tabId: t
        })
    }
});

chrome['tabs'].onRemoved.addListener(function(t) {
    delete bg.domains[t]
});
bg.config.toggle || bg.changeToggleIcon(false);
bg.blacklist = "/blacklist.txt";

chrome['runtime'].onMessage.addListener(function(t, e, o) {
    switch (t.type) {
        case "GET_STATE":
            var data = {
                whitelisted: bg.isDomainWhitelisted(bg.domains[t.tabId]),
                domain: bg.domains[t.tabId],
                detected: bg.detected[t.tabId] || false,
                toggle: bg.config.toggle
            };
            o(data);
            break;
        case "TOGGLE":
            bg.config.toggle = !bg.config.toggle;
            bg.saveConfig();
            bg.changeToggleIcon(bg.config.toggle);
            o(bg.config.toggle);
            break;
        case "WHITELIST":
            if (t.whitelisted) {
                bg.removeDomainFromWhitelist(bg.domains[t.tabId], t.time)
            } else {
                bg.addDomainToWhitelist(bg.domains[t.tabId], t.time);
                o(!t.whitelisted)
            }
    }
});

fetch("/blacklist.txt").then(function(t) {
    t.text().then(function(t) {
        if ("" === t) throw "Empty response";
        bg.runBlocker(t)
    })
}).catch(function(t) {

});