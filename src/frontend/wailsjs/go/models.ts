export namespace models {
	
	export class Project {
	    id: number;
	    name: string;
	    filename_format: string;
	    report_title_format: string;
	    default_directory: string;
	    use_year_subfolders: boolean;
	    recipients_to: string;
	    recipients_cc: string;
	    recipients_bcc: string;
	    master_stylesheet: string;
	    is_archived: boolean;
	    // Go type: time
	    created_at: any;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new Project(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.filename_format = source["filename_format"];
	        this.report_title_format = source["report_title_format"];
	        this.default_directory = source["default_directory"];
	        this.use_year_subfolders = source["use_year_subfolders"];
	        this.recipients_to = source["recipients_to"];
	        this.recipients_cc = source["recipients_cc"];
	        this.recipients_bcc = source["recipients_bcc"];
	        this.master_stylesheet = source["master_stylesheet"];
	        this.is_archived = source["is_archived"];
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ReportSection {
	    id: number;
	    project_id: number;
	    name: string;
	    type: string;
	    content: string;
	    order: number;
	    is_enabled: boolean;
	    // Go type: time
	    created_at: any;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new ReportSection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.project_id = source["project_id"];
	        this.name = source["name"];
	        this.type = source["type"];
	        this.content = source["content"];
	        this.order = source["order"];
	        this.is_enabled = source["is_enabled"];
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ReportSnapshot {
	    id: number;
	    project_id: number;
	    markdown_content: string;
	    // Go type: time
	    finalized_at: any;
	
	    static createFrom(source: any = {}) {
	        return new ReportSnapshot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.project_id = source["project_id"];
	        this.markdown_content = source["markdown_content"];
	        this.finalized_at = this.convertValues(source["finalized_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class StatusDefinition {
	    id: number;
	    project_id: number;
	    name: string;
	    style: string;
	    order: number;
	    // Go type: time
	    created_at: any;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new StatusDefinition(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.project_id = source["project_id"];
	        this.name = source["name"];
	        this.style = source["style"];
	        this.order = source["order"];
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Subtask {
	    id: number;
	    task_id: number;
	    name: string;
	    status: string;
	    // Go type: time
	    expected_completion_date?: any;
	    url: string;
	    notes: string;
	    is_deleted: boolean;
	    // Go type: time
	    created_at: any;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new Subtask(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.task_id = source["task_id"];
	        this.name = source["name"];
	        this.status = source["status"];
	        this.expected_completion_date = this.convertValues(source["expected_completion_date"], null);
	        this.url = source["url"];
	        this.notes = source["notes"];
	        this.is_deleted = source["is_deleted"];
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Task {
	    id: number;
	    project_id: number;
	    report_section_id: number;
	    name: string;
	    status: string;
	    // Go type: time
	    expected_completion_date?: any;
	    url: string;
	    notes: string;
	    priority: number;
	    is_deleted: boolean;
	    is_archived: boolean;
	    // Go type: time
	    created_at: any;
	    // Go type: time
	    updated_at: any;
	
	    static createFrom(source: any = {}) {
	        return new Task(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.project_id = source["project_id"];
	        this.report_section_id = source["report_section_id"];
	        this.name = source["name"];
	        this.status = source["status"];
	        this.expected_completion_date = this.convertValues(source["expected_completion_date"], null);
	        this.url = source["url"];
	        this.notes = source["notes"];
	        this.priority = source["priority"];
	        this.is_deleted = source["is_deleted"];
	        this.is_archived = source["is_archived"];
	        this.created_at = this.convertValues(source["created_at"], null);
	        this.updated_at = this.convertValues(source["updated_at"], null);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace services {
	
	export class ExportService {
	
	
	    static createFrom(source: any = {}) {
	        return new ExportService(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}
	export class RenderedSection {
	    Name: string;
	    Type: string;
	    Content: string;
	
	    static createFrom(source: any = {}) {
	        return new RenderedSection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Name = source["Name"];
	        this.Type = source["Type"];
	        this.Content = source["Content"];
	    }
	}
	export class Recipients {
	    To: string;
	    CC: string;
	    BCC: string;
	
	    static createFrom(source: any = {}) {
	        return new Recipients(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.To = source["To"];
	        this.CC = source["CC"];
	        this.BCC = source["BCC"];
	    }
	}
	export class GeneratedReport {
	    Title: string;
	    Recipients: Recipients;
	    Sections: RenderedSection[];
	    CSS: string;
	
	    static createFrom(source: any = {}) {
	        return new GeneratedReport(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Title = source["Title"];
	        this.Recipients = this.convertValues(source["Recipients"], Recipients);
	        this.Sections = this.convertValues(source["Sections"], RenderedSection);
	        this.CSS = source["CSS"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ProjectService {
	
	
	    static createFrom(source: any = {}) {
	        return new ProjectService(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}
	
	
	export class ReportService {
	
	
	    static createFrom(source: any = {}) {
	        return new ReportService(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}
	export class TaskService {
	
	
	    static createFrom(source: any = {}) {
	        return new TaskService(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}

}

