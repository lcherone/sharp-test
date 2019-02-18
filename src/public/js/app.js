var throttleTime = 200;

_.deepClone = function (val) {
    return JSON.parse(JSON.stringify(val));
};

// target elements with the "draggable" class
interact('.draggable').draggable({
    allowFrom: '.drag-handle',
    inertia: true,
    autoScroll: true,
    onmove: function (event) {
        var target = event.target,
            // keep the dragged position in the data-x/data-y attributes
            x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
            y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

        // translate the element
        target.style.webkitTransform = target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';

        // update the posiion attributes
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);
    }
});

//
var vm = new Vue({
    el: '#app',
    data() {
        return {
            defaults: defaults,
            state: {
                page: 'index',
                errors: {
                    global: ''
                }
            },
            images: [],
            image: {
                processing: false,
                name: 'default.jpg',
                mtime: new Date(),
                size: 0,
                src: '',
                upload: {},
                metadata: {}
            },
            form: {
                errors: {},
                values: {}
            },
            loadingTimer: 0
        }
    },
    watch: {
        'image.name': function () {
            //
            this.image.processing = true;
            this.image.src = '/images/' + this.image.name + '?' + $.param(this.form.values);

            clearTimeout(this.loadingTimer);
            this.loadingTimer = setTimeout(function () {
                this.image.processing = false;
            }.bind(this), throttleTime + 10);

            $.ajax({
                type: "HEAD",
                async: true,
                url: '/images/' + this.image.name + '?' + $.param(this.form.values),
            }).done(function (data, text, jqXHR) {
                var metadata = JSON.parse(jqXHR.getResponseHeader('Metadata'));
                if (metadata) {
                    this.$set(this.image, 'metadata', metadata.metadata || {});
                    this.image.mtime = metadata.mtime || 0;
                    this.image.size = metadata.size || 0;
                }
            }.bind(this));
        },
        'form.values': {
            handler: _.throttle(function () {
                //
                this.image.processing = true;
                this.image.src = '/images/' + this.image.name + '?' + $.param(this.form.values);

                clearTimeout(this.loadingTimer);
                this.loadingTimer = setTimeout(function () {
                    this.image.processing = false;
                }.bind(this), throttleTime + 10);

                $.ajax({
                    type: "HEAD",
                    async: true,
                    url: '/images/' + this.image.name + '?' + $.param(this.form.values),
                }).done(function (data, text, jqXHR) {
                    var metadata = JSON.parse(jqXHR.getResponseHeader('Metadata'));
                    if (metadata) {
                        this.$set(this.image, 'metadata', metadata.metadata || {});
                        this.image.mtime = metadata.mtime || 0;
                        this.image.size = metadata.size || 0;
                    }
                }.bind(this));
            }, throttleTime),
            deep: true
        }
    },
    created() {
        this.form.values = _.deepClone(this.defaults);
        this.getImages();
    },
    mounted() { },
    methods: {
        getImages() {
            $.ajax({
                type: "GET",
                url: '/api/images',
                dataType: 'json'
            }).done(function (data) {
                this.images = data;
            }.bind(this)).fail(function (err) {
                this.state.errors.global = 'Failed to load images';
            }.bind(this));
        },
        resetForm() {
            this.form.values = _.deepClone(this.defaults);
        },
        setSize(x, y) {
            this.form.values.resize.width = x;
            this.form.values.resize.height = y;
        },
        editImage(image) {
            this.image.name = image.name || 'default.jpg';
            this.image.metadata = image.metadata || {};
            this.image.size = image.size || 0;

            this.$nextTick(function () {
                this.state.page = 'edit';
            });
        },
        uploadImage(event) {
            //
            this.image.processing = true;

            var data = new FormData();
            data.append('file', event.target.files[0]);
            data.append('meta', JSON.stringify({
                name: event.target.files[0].name || '',
                size: event.target.files[0].size || 0,
                type: event.target.files[0].type || 'image/unknown',
                lastModified: event.target.files[0].lastModified || 0
            }));

            $.ajax({
                url: '/upload',
                data: data,
                cache: false,
                contentType: false,
                processData: false,
                method: 'POST',
                success: function (data) {
                    if (data.error) {
                        this.state.errors.global = data.error;
                    } else {
                        $.ajax({
                            type: "GET",
                            url: '/api/images',
                            dataType: 'json',
                        }).done(function (data) {
                            this.image.processing = false;
                            this.images = data
                            if (this.state.page === 'edit') {
                                for (let i in this.images) {
                                    if (this.images[i].name === event.target.files[0].name) {
                                        this.editImage(this.images[i]);
                                        break;
                                    }
                                }
                            }
                        }.bind(this)).fail(function (err) {
                            this.state.errors.global = 'Failed to load images';
                        }.bind(this));
                    }
                }.bind(this)
            });

            /*
            var reader = new FileReader()
            reader.onload = function (e) {
                console.log(e.target.result)
            };
            reader.readAsArrayBuffer(event.target.files[0]);
            */
        },
        formatBytes(bytes, decimals) {
            if (bytes == 0) return '0 Bytes';
            var k = 1024,
                dm = decimals <= 0 ? 0 : decimals || 2,
                sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
                i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        }
    }
});