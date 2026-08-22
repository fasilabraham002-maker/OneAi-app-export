package com.oneai.app;

import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Base64;

@CapacitorPlugin(name = "AndroidUriReader")
public class AndroidUriReaderPlugin extends Plugin {

    @PluginMethod
    public void openDocument(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("*/*");

        intent.putExtra(
            Intent.EXTRA_MIME_TYPES,
            new String[] {
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "text/*",
                "application/octet-stream"
            }
        );

        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION |
            Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        );

        startActivityForResult(call, intent, "documentPickerResult");
    }

    @ActivityCallback
    private void documentPickerResult(PluginCall call, androidx.activity.result.ActivityResult result) {
        if (call == null) {
            return;
        }

        if (result == null || result.getResultCode() != android.app.Activity.RESULT_OK) {
            call.reject("Document selection cancelled");
            return;
        }

        Intent data = result.getData();

        if (data == null || data.getData() == null) {
            call.reject("Android did not return a document URI");
            return;
        }

        Uri uri = data.getData();

        try {
            int takeFlags = data.getFlags()
                & (Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

            if (takeFlags != 0) {
                try {
                    getContext().getContentResolver()
                        .takePersistableUriPermission(uri, takeFlags);
                } catch (Exception ignored) {
                    // Some document providers do not support persistable permissions.
                }
            }

            String fileName = getFileName(uri);
            String mimeType = getContext()
                .getContentResolver()
                .getType(uri);

            JSObject resultObject = new JSObject();
            resultObject.put("uri", uri.toString());
            resultObject.put(
                "fileName",
                fileName != null ? fileName : "selected_document"
            );
            resultObject.put(
                "mimeType",
                mimeType != null ? mimeType : "application/octet-stream"
            );

            call.resolve(resultObject);

        } catch (Exception e) {
            call.reject(
                "Unable to process selected document: " +
                (e.getMessage() != null
                    ? e.getMessage()
                    : e.getClass().getSimpleName())
            );
        }
    }

    private String getFileName(Uri uri) {
        Cursor cursor = null;

        try {
            cursor = getContext()
                .getContentResolver()
                .query(
                    uri,
                    new String[] { OpenableColumns.DISPLAY_NAME },
                    null,
                    null,
                    null
                );

            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);

                if (index >= 0) {
                    return cursor.getString(index);
                }
            }
        } catch (Exception ignored) {
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }

        return null;
    }

    @PluginMethod
    public void readUri(PluginCall call) {
        String uriString = call.getString("uri");

        if (uriString == null || uriString.trim().isEmpty()) {
            call.reject("URI is required");
            return;
        }

        try {
            Uri uri = Uri.parse(uriString);

            ContentResolver resolver =
                getContext().getContentResolver();

            InputStream inputStream =
                resolver.openInputStream(uri);

            if (inputStream == null) {
                call.reject(
                    "Android could not open the selected document URI"
                );
                return;
            }

            ByteArrayOutputStream output =
                new ByteArrayOutputStream();

            byte[] buffer = new byte[8192];
            int bytesRead;

            while ((bytesRead = inputStream.read(buffer)) != -1) {
                output.write(buffer, 0, bytesRead);
            }

            inputStream.close();

            String base64 =
                Base64.getEncoder()
                    .encodeToString(output.toByteArray());

            JSObject result = new JSObject();
            result.put("data", base64);

            call.resolve(result);

        } catch (Exception e) {
            call.reject(
                "Unable to read Android document: " +
                (e.getMessage() != null
                    ? e.getMessage()
                    : e.getClass().getSimpleName())
            );
        }
    }
}
