import React, { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { excelApi } from "../api/apiEndpoints";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { UploadCloud, File, X, Download } from "lucide-react";
import Spinner from "../components/common/Spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SessionSelector from "../components/common/SessionSelector";

const FILE_TYPES = [
    "text/csv",
    "application/zip",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const POLYGON_TYPES = [
    "application/zip",
    "application/geo+json",
    "application/json",
    "text/csv",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // Increased to 100MB

const UploadDataPage = () => {
    const [sessionFiles, setSessionFiles] = useState([]);
    const [predictionFiles, setPredictionFiles] = useState([]);
    const [polygonFile, setPolygonFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [remarks, setRemarks] = useState("");
    const [projectName, setProjectName] = useState("");
    const [selectedSessions, setSelectedSessions] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [activeTab, setActiveTab] = useState("session");
    const [errorLog, setErrorLog] = useState("");

    const validateFile = (file, allowedTypes) => {
        if (![...allowedTypes, ""].includes(file.type)) { // Allow empty type for some zip files
            toast.error(`File type '${file.type || "unknown"}' not supported.`);
            return false;
        }
        if (file.size > MAX_FILE_SIZE) {
            toast.error("File is too large. (Max 100MB)");
            return false;
        }
        return true;
    };

    const onDropSession = useCallback(
        (acceptedFiles) => {
            const valid = acceptedFiles.filter((file) => validateFile(file, FILE_TYPES));
            if (valid.length > 0) setSessionFiles(valid); // Replace instead of append for single file
        },
        []
    );

    const onDropPrediction = useCallback(
        (acceptedFiles) => {
            const valid = acceptedFiles.filter((file) => validateFile(file, FILE_TYPES));
             if (valid.length > 0) setPredictionFiles(valid); // Replace
        },
        []
    );

    const onDropPolygon = useCallback(
        (acceptedFiles) => {
            const valid = acceptedFiles.filter((file) => validateFile(file, POLYGON_TYPES));
            if (valid.length > 0) setPolygonFile(valid[0]);
        },
        []
    );

    const { getRootProps: getRootPropsSession, getInputProps: getInputPropsSession, isDragActive: isDragActiveSession } = useDropzone({
        onDrop: onDropSession,
        multiple: false
    });

    const { getRootProps: getRootPropsPrediction, getInputProps: getInputPropsPrediction, isDragActive: isDragActivePrediction } = useDropzone({
        onDrop: onDropPrediction,
        multiple: false
    });

    const { getRootProps: getRootPropsPolygon, getInputProps: getInputPropsPolygon, isDragActive: isDragActivePolygon } = useDropzone({
        onDrop: onDropPolygon,
        multiple: false
    });

    const removeFile = (fileToRemove, type) => {
        if (type === "session") setSessionFiles([]);
        else if (type === "prediction") setPredictionFiles([]);
        else if (type === "polygon") setPolygonFile(null);
    };

    const fetchUploadedFiles = useCallback(async () => {
        setHistoryLoading(true);
        try {
            // NOTE: Your GetUploadedExcelFiles takes a FileType. Assuming 0 is a placeholder for "all".
            // If you want separate histories, you'll need to call this per tab.
            const response = await excelApi.getUploadedFiles(activeTab === "session" ? 1 : 2);
            setUploadedFiles(response.Data || []);
        } catch (error) {
            toast.error(`Failed to fetch uploaded files: ${error.message}`);
            setUploadedFiles([]);
        } finally {
            setHistoryLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchUploadedFiles();
    }, [fetchUploadedFiles, activeTab]);

    const handleUpload = async () => {
        const files = activeTab === "session" ? sessionFiles : predictionFiles;
        if (files.length === 0) {
            toast.warn("Please select a main data file to upload.");
            return;
        }
        if (activeTab === "prediction" && !projectName.trim()) {
            toast.warn("Project Name is required for Prediction upload.");
            return;
        }

        setLoading(true);
        setErrorLog("");
        const formData = new FormData();

        // --- FIX 1: Correct FormData keys to match C# Controller ---
        // Backend expects 'UploadFile' and 'UploadNoteFile' from IFormCollection.Files
        formData.append("UploadFile", files[0]);
        if (polygonFile) {
            formData.append("UploadNoteFile", polygonFile);
        }

        // Append other form fields
        formData.append("UploadFileType", activeTab === "session" ? "1" : "2");
        formData.append("remarks", remarks);
        formData.append("ProjectName", projectName);
        formData.append("SessionIds", selectedSessions.join(',')); // --- FIX 2: Added SessionIds ---

        try {
            const resp = await excelApi.uploadFile(formData);

            // --- FIX 3: Check 'Status' (int) instead of 'success' (boolean) ---
            if (resp.Status === 1) {
                toast.success("File uploaded successfully! Processing started.");
                setSessionFiles([]);
                setPredictionFiles([]);
                setPolygonFile(null);
                setRemarks("");
                setProjectName("");
                setSelectedSessions([]);
                setErrorLog("");
                fetchUploadedFiles();
            } else {
                // Use 'Message' from the response for the error log
                const errorMessage = resp.Message || "An unknown error occurred during processing.";
                setErrorLog(errorMessage);
                toast.error("Processing failed. See error log for details.");
            }
        } catch (error) {
            const serverError = error.response?.data?.Message || error.message;
            toast.error(`Upload failed: ${serverError}`);
            setErrorLog(serverError);
        } finally {
            setLoading(false);
        }
    };
    
    const handleDownloadTemplate = async () => {
        try {
            // Assuming FileType 1 for Session, 2 for Prediction
            const fileType = activeTab === 'session' ? 1 : 2;
            const fileName = activeTab === 'session' ? "Session_Template.zip" : "Prediction_Template.zip";
            
            const response = await excelApi.downloadTemplate(fileType);
            const blob = new Blob([response], { type: 'application/zip' });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

        } catch (error) {
            toast.error(`Failed to download template: ${error.message}`);
        }
    };

    const renderFileList = (files, type) =>
        files.length > 0 && (
            <div className="mt-4 space-y-2">
                {files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded px-2 py-1">
                        <div className="flex items-center gap-2">
                            <File className="h-5 w-5 text-gray-500 dark:text-gray-300" />
                            <span className="text-gray-800 dark:text-gray-200">{file.name}</span>
                            <span className="text-xs text-gray-400">
                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); removeFile(file, type); }} className="text-red-500 hover:text-red-700" title="Remove">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                ))}
            </div>
        );

    const renderFileInput = (getRootProps, getInputProps, isDragActive, files, type, label) => (
        <div {...getRootProps()} className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragActive ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900" : "border-gray-300 dark:border-gray-600"}`}>
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {label || (isDragActive ? "Drop the file here..." : "Drag 'n' drop a file here, or click to select")}
            </p>
            {renderFileList(files, type)}
        </div>
    );

    return (
        <div className="p-6 h-full flex flex-col items-center bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <div className="w-full max-w-4xl">
                <h1 className="text-2xl font-semibold mb-4 text-center">Upload Data</h1>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="session">Upload Session Data</TabsTrigger>
                        <TabsTrigger value="prediction">Upload Prediction Data</TabsTrigger>
                    </TabsList>

                    <TabsContent value="session" className="space-y-4 mt-4">
                         {renderFileInput(getRootPropsSession, getInputPropsSession, isDragActiveSession, sessionFiles, "session", "Session Data File (.csv or .zip)")}
                        <Textarea placeholder="Remarks (Optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                    </TabsContent>

                    <TabsContent value="prediction" className="space-y-4 mt-4">
                        {renderFileInput(getRootPropsPrediction, getInputPropsPrediction, isDragActivePrediction, predictionFiles, "prediction", "Prediction Data File (.csv or .zip)")}
                        <div>
                            <label className="block font-semibold mb-1">Inbound Polygon File (Required)</label>
                            {renderFileInput(getRootPropsPolygon, getInputPropsPolygon, isDragActivePolygon, polygonFile ? [polygonFile] : [], "polygon", "Polygon File (.zip, .geojson, .json)")}
                        </div>
                        <Input placeholder="Project Name" value={projectName} onChange={(e) => setProjectName(e.target.value)} />
                        <SessionSelector selectedSessions={selectedSessions} setSelectedSessions={setSelectedSessions} />
                        <Textarea placeholder="Remarks (Optional)" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                    </TabsContent>
                </Tabs>

                {errorLog && (
                    <div className="mt-6 p-4 bg-red-50 border border-red-300 text-red-700 rounded whitespace-pre-wrap max-h-60 overflow-auto">
                        <div className="font-bold mb-2">Error Log:</div>
                        <code>{errorLog}</code>
                    </div>
                )}

                <div className="mt-8 text-center flex justify-center gap-4">
                    <Button onClick={handleUpload} disabled={loading} size="lg">
                        {loading ? <Spinner /> : "Upload & Process"}
                    </Button>
                     <Button onClick={handleDownloadTemplate} variant="outline" size="lg">
                        <Download className="mr-2 h-4 w-4" />
                        Download Template
                    </Button>
                </div>

                <div className="mt-10">
                    <h2 className="text-xl font-semibold mb-4">Upload History for '{activeTab}'</h2>
                    <div className="border rounded-lg">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>File Name</TableHead>
                                    <TableHead>Uploaded By</TableHead>
                                    <TableHead>Uploaded On</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Remarks</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {historyLoading ? (
                                    <TableRow><TableCell colSpan={5} className="text-center"><Spinner /></TableCell></TableRow>
                                ) : uploadedFiles.length > 0 ? (
                                    uploadedFiles.map((file) => (
                                        <TableRow key={file.id}>
                                            <TableCell>{file.file_name}</TableCell>
                                            <TableCell>{file.uploaded_by}</TableCell>
                                            <TableCell>{new Date(file.uploaded_on).toLocaleString()}</TableCell>
                                            <TableCell className={file.status === "Success" ? "text-green-500" : "text-red-500"}>{file.status}</TableCell>
                                            <TableCell>{file.remarks}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={5} className="text-center h-24">No history found.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UploadDataPage;