var app = new Vue({
    el: '#app',
    data:{
        data_list: [],
        data_raw: {}
    },
    computed: {
    },
    mounted: function() {
		this.getSaveData()
	},
	updated: function() {

	},
    methods:{
        getSaveData(){
            var that = this
            chrome.storage.sync.get(callback=function(items) {
                console.log(items)
                that.data_raw = items
                that.data_list = []
                for (item in items){
                    that.data_list.push(items[item])
                }
                console.log("已读取所有保存数据")
            })
        },
        delRecord(room_id){
            var that = this
			chrome.storage.sync.remove(room_id.toString())
            this.getSaveData()
			console.log("已删除本直播间记录")
        },
        exportData(room_id){
			var that = this
            var text = ""
            data = this.data_raw[room_id]
			text = text + "直播间："+ data.title　+ "\n开播时间：" + data.live_time + "\n"
			for (item in data.list){
				text = text + data.list[item].time + " - " + data.list[item].desc + "\n"
			}

			this.$copyText(text).then(function (e) {
				console.log(that.$refs.loginput)
				that.$message({
					message:'记录已拷贝到剪贴板',
					offset:10,
					center:true,
					duration:3000});
			  }, function (e) {
				that.$message({
					message:'拷贝到剪贴板错误',
					offset:10,
					center:true,
					duration:1000});
			})
        },
        clearAll(){
			chrome.storage.sync.clear()
            this.getSaveData()
			console.log("已清空所有保存数据")
        },
    
    }
});
